"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ScanLine, ChefHat, Camera, VideoOff, AlertCircle, Search } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';

const allergenFormSchema = z.object({
  barcode: z.string().nonempty({ message: "Barcode is required to search for a product." }),
});

export type AllergenFormData = z.infer<typeof allergenFormSchema>;

interface AllergenFormProps {
  // onSubmit is no longer needed as navigation happens directly
  isLoading?: boolean; // Kept if parent wants to control overall app state, but form itself won't have internal loading for AI/fetch
}

export function AllergenForm({ isLoading: externalIsLoading = false }: AllergenFormProps) {
  const form = useForm<AllergenFormData>({
    resolver: zodResolver(allergenFormSchema),
    defaultValues: {
      barcode: '',
    },
  });
  const router = useRouter();
  const { toast } = useToast();

  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  // isLoading for the form itself, e.g. when camera is processing.
  const [isFormProcessing, setIsFormProcessing] = useState(false);


  useEffect(() => {
    if (!isCameraOpen) {
        if (codeReaderRef.current) {
            codeReaderRef.current.reset();
        }
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
        return;
    }

    codeReaderRef.current = new BrowserMultiFormatReader();
    let streamInstance: MediaStream | null = null;

    const startScanning = async () => {
        setCameraError(null);
        setIsFormProcessing(true);
        try {
            streamInstance = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            setHasCameraPermission(true);

            if (videoRef.current && codeReaderRef.current) {
                videoRef.current.srcObject = streamInstance;
                
                await videoRef.current.play();

                if (codeReaderRef.current && videoRef.current && videoRef.current.readyState >= videoRef.current.HAVE_METADATA) {
                    codeReaderRef.current.decodeFromVideoElement(videoRef.current, (result, err) => {
                        if (result) {
                            const scannedBarcode = result.getText();
                            form.setValue("barcode", scannedBarcode, { shouldValidate: true });
                            setIsCameraOpen(false); // Close camera UI
                            setIsFormProcessing(false);
                            router.push(`/product/${scannedBarcode}`); // Navigate
                        }
                        if (err) {
                            if (!(err instanceof NotFoundException) && err.name !== 'ChecksumException' && err.name !== 'FormatException') {
                                console.warn('Barcode decoding error:', err);
                                // Potentially set a less intrusive scan error message
                            }
                        }
                    }).catch(decodeErr => {
                        console.error("Error starting decodeFromVideoElement:", decodeErr);
                        setCameraError("Could not start barcode scanner. Try again or check camera.");
                        setIsCameraOpen(false);
                        setIsFormProcessing(false);
                    });
                }
            }
        } catch (error) {
            console.error('Error accessing camera:', error);
            setHasCameraPermission(false);
            const permissionError = 'Camera access denied. Please enable camera permissions in your browser settings to use the scanner.';
            setCameraError(permissionError);
            toast({
                variant: 'destructive',
                title: 'Camera Access Denied',
                description: permissionError,
            });
            setIsCameraOpen(false); 
            setIsFormProcessing(false);
        } finally {
          // setIsFormProcessing(false); // Moved to specific paths to avoid premature reset
        }
    };

    startScanning();

    return () => {
        if (codeReaderRef.current) {
            codeReaderRef.current.reset();
        }
        if (streamInstance) {
            streamInstance.getTracks().forEach(track => track.stop());
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        setIsFormProcessing(false); // Ensure processing is false when cleaning up
    };
  }, [isCameraOpen, form, toast, router]); 

  const toggleCameraScan = () => {
    const newCameraState = !isCameraOpen;
    setIsCameraOpen(newCameraState);
    if (newCameraState) {
        setCameraError(null); 
        form.setValue("barcode", ""); // Clear barcode input when camera opens
    }
  };
  
  const handleFormSubmit = (data: AllergenFormData) => {
    if (isFormProcessing || externalIsLoading) return;
    router.push(`/product/${data.barcode}`);
  };

  const currentIsLoading = externalIsLoading || isFormProcessing;

  return (
    <Card className="w-full max-w-lg mx-auto shadow-xl">
      <CardHeader className="text-center">
        <div className="flex justify-center items-center mb-4">
           <ChefHat size={48} className="text-primary" />
        </div>
        <CardTitle className="text-2xl font-bold">Find Product Information</CardTitle>
        <CardDescription>Scan a barcode or enter it manually to see product details and allergen analysis.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
            <div className="space-y-2">
                <FormLabel className="flex items-center gap-2">
                    <ScanLine size={18}/>Barcode
                </FormLabel>
                <div className="flex items-start gap-2">
                    <FormField
                    control={form.control}
                    name="barcode"
                    render={({ field }) => (
                        <FormItem className="flex-grow">
                        <FormControl>
                            <Input 
                                placeholder="e.g., 1234567890123" 
                                {...field} 
                                disabled={isCameraOpen || currentIsLoading} 
                            />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <Button type="button" onClick={toggleCameraScan} variant="outline" size="icon" aria-label={isCameraOpen ? "Stop Scanning" : "Scan with Camera"} disabled={currentIsLoading}>
                        {isCameraOpen ? <VideoOff size={20} /> : <Camera size={20} />}
                    </Button>
                </div>
            </div>

            {isCameraOpen && (
                <div className="space-y-2">
                    <video ref={videoRef} className="w-full aspect-video rounded-md bg-muted border" autoPlay muted playsInline />
                    {cameraError && (
                         <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Camera Error</AlertTitle>
                            <AlertDescription>{cameraError}</AlertDescription>
                        </Alert>
                    )}
                    {hasCameraPermission === false && !cameraError && ( 
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Camera Access Required</AlertTitle>
                            <AlertDescription>
                                Please allow camera access in your browser settings to use the scanner.
                            </AlertDescription>
                        </Alert>
                    )}
                     {hasCameraPermission === true && !cameraError && (
                        <Alert variant="default" className="bg-primary/10 border-primary/30 dark:bg-primary/20 dark:border-primary/40">
                           <ScanLine className="h-4 w-4 text-primary"/>
                            <AlertTitle>Scanning Active</AlertTitle>
                            <AlertDescription>
                                Point your camera at a barcode. Scanner is active.
                            </AlertDescription>
                        </Alert>
                    )}
                </div>
            )}
            
            <Button type="submit" className="w-full" disabled={currentIsLoading || isCameraOpen}>
              {currentIsLoading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {isCameraOpen ? 'Scanning...' : 'Processing...'}
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <Search size={20}/> Search Product
                </div>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
