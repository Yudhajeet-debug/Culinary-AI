
import { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type } from '@google/genai';
import { Recipe } from '../types';

// Helper functions for audio encoding/decoding, must be defined at the top level.
function encode(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function decode(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

async function decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
}

// Function Declarations for Voice Control
const functionDeclarations: FunctionDeclaration[] = [
    {
        name: 'goToNextStep',
        description: 'Proceeds to the next step in the recipe.',
        parameters: { type: Type.OBJECT, properties: {} }
    },
    {
        name: 'goToPreviousStep',
        description: 'Goes back to the previous step in the recipe.',
        parameters: { type: Type.OBJECT, properties: {} }
    },
    {
        name: 'repeatCurrentStep',
        description: 'Repeats the instructions for the current step.',
        parameters: { type: Type.OBJECT, properties: {} }
    },
    {
        name: 'getIngredientSubstitution',
        description: 'Suggests a substitute for a missing ingredient.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                ingredient: { type: Type.STRING, description: 'The ingredient the user is missing.' }
            },
            required: ['ingredient']
        }
    },
    {
        name: 'addToShoppingList',
        description: 'Adds an item to the user\'s shopping list.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                item: { type: Type.STRING, description: 'The item to add to the shopping list.' }
            },
            required: ['item']
        }
    }
];

export interface AssistantCallbacks {
    onStepChange: (newStepIndex: number) => void;
    onGetSubstitution: (ingredient: string) => Promise<string>;
    onAddToShoppingList: (item: string) => void;
    getCurrentStep: () => number;
}

export const useLiveAssistant = (recipe: Recipe | null, callbacks: AssistantCallbacks) => {
    const [isSessionActive, setIsSessionActive] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    // Fix: Corrected a syntax error in the useState declaration.
    const [userTranscription, setUserTranscription] = useState('');
    const [assistantTranscription, setAssistantTranscription] = useState('');
    const [isAssistantSpeaking, setIsAssistantSpeaking] = useState(false);
    const [isProcessingCommand, setIsProcessingCommand] = useState(false);

    const sessionPromiseRef = useRef<Promise<any> | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
    
    const nextStartTimeRef = useRef<number>(0);
    const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

    const systemInstruction = `You are a friendly, expert culinary assistant. Your goal is to guide the user through a recipe, step by step, using voice commands.
    The recipe is called "${recipe?.recipeName}". The steps are: ${recipe?.steps.map((s, i) => `Step ${i + 1}: ${s}`).join(' ')}.
    Start by greeting the user and asking if they are ready to begin with step 1.
    The user will control the flow with commands like "next step", "previous step", or "repeat". Use the corresponding functions to manage the recipe flow. Do not say the step number unless the user asks for it.
    The user can also ask for ingredient substitutions (e.g., "What can I use instead of basil?") or add items to their shopping list (e.g., "Add milk to the shopping list"). Use the provided functions for these tasks.
    Answer any other cooking-related questions concisely and then ask if they're ready to continue.
    Keep your responses natural and conversational. For example, after a function call, confirm the action in a friendly way (e.g., "Okay, I've added milk to your list.").
    Use Markdown for formatting your responses when appropriate (e.g., for lists of ingredients or tips).`;


    const processMessage = useCallback(async (message: LiveServerMessage) => {
        if (message.serverContent?.outputTranscription?.text) {
            setAssistantTranscription(prev => prev + message.serverContent.outputTranscription.text);
        }
        if (message.serverContent?.inputTranscription?.text) {
            setUserTranscription(prev => prev + message.serverContent.inputTranscription.text);
        }
        if (message.serverContent?.turnComplete) {
            setUserTranscription('');
        }

        if (message.toolCall) {
            setIsProcessingCommand(true);
            const session = await sessionPromiseRef.current;
            if (!session) {
                setIsProcessingCommand(false);
                return;
            }
            
            try {
                for (const fc of message.toolCall.functionCalls) {
                    let result: any = "An unknown error occurred.";
                    try {
                        switch (fc.name) {
                            case 'goToNextStep':
                                const nextStep = Math.min(recipe!.steps.length - 1, callbacks.getCurrentStep() + 1);
                                callbacks.onStepChange(nextStep);
                                result = `Moved to step ${nextStep + 1}.`;
                                break;
                            case 'goToPreviousStep':
                                const prevStep = Math.max(0, callbacks.getCurrentStep() - 1);
                                callbacks.onStepChange(prevStep);
                                result = `Moved back to step ${prevStep + 1}.`;
                                break;
                            case 'repeatCurrentStep':
                                 const currentStep = callbacks.getCurrentStep();
                                 callbacks.onStepChange(currentStep);
                                 result = `Repeating step ${currentStep + 1}.`;
                                 break;
                            case 'getIngredientSubstitution':
                                result = await callbacks.onGetSubstitution(fc.args.ingredient as string);
                                break;
                            case 'addToShoppingList':
                                callbacks.onAddToShoppingList(fc.args.item as string);
                                result = `Successfully added ${fc.args.item as string} to the shopping list.`;
                                break;
                        }
                        session.sendToolResponse({ functionResponses: { id: fc.id, name: fc.name, response: { result } } });
                    } catch (e) {
                         session.sendToolResponse({ functionResponses: { id: fc.id, name: fc.name, response: { result: e instanceof Error ? e.message : "Error" } } });
                    }
                }
            } finally {
                setIsProcessingCommand(false);
            }
        }
        
        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
        if (base64Audio && outputAudioContextRef.current) {
            setIsAssistantSpeaking(true);
            const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContextRef.current, 24000, 1);
            const source = outputAudioContextRef.current.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(outputAudioContextRef.current.destination);

            source.onended = () => {
                audioSourcesRef.current.delete(source);
                if (audioSourcesRef.current.size === 0) {
                    setIsAssistantSpeaking(false);
                    setAssistantTranscription('');
                }
            };
            
            const currentTime = outputAudioContextRef.current.currentTime;
            const startTime = Math.max(currentTime, nextStartTimeRef.current);
            source.start(startTime);
            nextStartTimeRef.current = startTime + audioBuffer.duration;
            audioSourcesRef.current.add(source);
        }
        
    }, [callbacks, recipe]);


    const startSession = useCallback(async () => {
        if (!recipe) return;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;

            inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            sessionPromiseRef.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        setIsSessionActive(true);
                        const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
                        sourceNodeRef.current = source;
                        
                        const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
                        scriptProcessorRef.current = scriptProcessor;

                        scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const int16 = new Int16Array(inputData.length);
                            for (let i = 0; i < inputData.length; i++) {
                                int16[i] = inputData[i] * 32768;
                            }
                            const pcmBlob = {
                                data: encode(new Uint8Array(int16.buffer)),
                                mimeType: 'audio/pcm;rate=16000',
                            };
                            if (!isMuted) {
                                sessionPromiseRef.current?.then((session) => {
                                    session.sendRealtimeInput({ media: pcmBlob });
                                });
                            }
                        };
                        source.connect(scriptProcessor);
                        scriptProcessor.connect(inputAudioContextRef.current!.destination);
                    },
                    onmessage: processMessage,
                    onerror: (e) => console.error("Session error:", e),
                    onclose: () => setIsSessionActive(false),
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    outputAudioTranscription: {},
                    inputAudioTranscription: {},
                    systemInstruction: systemInstruction,
                    tools: [{ functionDeclarations }]
                }
            });

        } catch (error) {
            console.error("Failed to start session:", error);
        }
    }, [recipe, processMessage, isMuted, systemInstruction]);

    const endSession = useCallback(() => {
        mediaStreamRef.current?.getTracks().forEach(track => track.stop());
        sourceNodeRef.current?.disconnect();
        scriptProcessorRef.current?.disconnect();
        inputAudioContextRef.current?.close().catch(console.error);
        outputAudioContextRef.current?.close().catch(console.error);

        sessionPromiseRef.current?.then(session => session.close());
        sessionPromiseRef.current = null;
        
        setIsSessionActive(false);
    }, []);

    useEffect(() => {
        return () => {
            endSession();
        };
    }, [endSession]);

    const toggleMute = () => setIsMuted(prev => !prev);

    return { isSessionActive, isMuted, userTranscription, assistantTranscription, isAssistantSpeaking, isProcessingCommand, startSession, endSession, toggleMute };
};
