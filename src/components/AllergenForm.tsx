"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Barcode, Info, ListChecks, ScanLine, FileText, ChefHat, AlertCircle, Camera, VideoOff, AlertTriangle } from 'lucide-react';
import { useEffect, useState, useCallback, useRef } from 'react';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
import { useToast } from "@/hooks/use-toast";

const allergenFormSchema = z.object({
  barcode: z.string().optional(),
  productName: z.string().optional(), 
  ingredients: z.string().min(1, { message: "Ingredients list is required. If not found via barcode or if product details are incomplete, please enter manually." }),
  productDescription: z.string().optional(),
});

export type AllergenFormData = z.infer<typeof allergenFormSchema>;

interface AllergenFormProps {
  onSubmit: (data: AllergenFormData) => void;
  isLoading: boolean; 
}

export function AllergenForm({ onSubmit, isLoading }: AllergenFormProps) {
  const form = useForm<AllergenFormData>({
    resolver: zodResolver(allergenFormSchema),
    defaultValues: {
      barcode: '',
      productName: '',
      ingredients: '',
      productDescription: '',
    },
  });

  const [isFetchingBarcode, setIsFetchingBarcode] = useState(false);
  const [barcodeError, setBarcodeError] = useState<string | null>(null);
  const [barcodeWarning, setBarcodeWarning] = useState<string | null>(null);
  const [lastFetchedBarcode, setLastFetchedBarcode] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const { toast } = useToast();


  const handleBarcodeFetch = useCallback(async (barcodeToFetch: string) => {
    if (!barcodeToFetch.trim()) {
      setBarcodeError(null); 
      setBarcodeWarning(null);
      setLastFetchedBarcode(null);
      return;
    }
    setIsFetchingBarcode(true);
    setBarcodeError(null);
    setBarcodeWarning(null);
    try {
      const response = await fetch(`/api/barcode?barcode=${barcodeToFetch}`);
      const data = await response.json();

      if (response.ok) {
        form.setValue("productName", data.productName || "", { shouldValidate: true });
        form.setValue("ingredients", data.ingredients || "", { shouldValidate: true });
        form.setValue("productDescription", data.productDescription || "", { shouldValidate: true });
        setLastFetchedBarcode(barcodeToFetch);
        
        if (data.warning) {
          setBarcodeWarning(data.warning);
        } else {
          setBarcodeWarning(null);
        }

        if (data.ingredients && data.ingredients.trim() !== "") {
          form.clearErrors("ingredients"); 
        }
        if (data.productName && data.productName.trim() !== "") {
            form.clearErrors("productName");
        }


      } else {
        setBarcodeError(data.error || "Failed to fetch barcode data. Please enter details manually.");
        // Do not clear form fields here, user might have typed them
        setLastFetchedBarcode(null); 
      }
    } catch (error) {
      console.error("Error fetching barcode data:", error);
      setBarcodeError("An error occurred fetching barcode data. Please enter details manually.");
      setLastFetchedBarcode(null);
    } finally {
      setIsFetchingBarcode(false);
    }
  }, [form]);

  // Effect to clear form and states if barcode is manually cleared
  useEffect(() => {
    const subscription = form.watch((value, { name, type }) => {
      if (name === 'barcode' && type === 'change') {
        const currentBarcodeValue = value.barcode?.trim();
        if (!currentBarcodeValue) {
          // Barcode field was cleared by user
          if (lastFetchedBarcode) { // only reset if we had fetched something for a previous barcode
            form.reset({
                ...form.getValues(), // keep other fields if any they typed
                barcode: '',
                productName: '',
                ingredients: '',
                productDescription: ''
            });
          }
          setLastFetchedBarcode(null);
          setBarcodeError(null);
          setBarcodeWarning(null);
          setIsFetchingBarcode(false);
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form, lastFetchedBarcode, setLastFetchedBarcode, setBarcodeError, setBarcodeWarning, setIsFetchingBarcode]);


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
        // Don't reset hasCameraPermission here, so UI can reflect last known state
        return;
    }

    codeReaderRef.current = new BrowserMultiFormatReader();
    let streamInstance: MediaStream | null = null;

    const startScanning = async () => {
        setCameraError(null); 
        try {
            streamInstance = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            setHasCameraPermission(true);

            if (videoRef.current && codeReaderRef.current) {
                videoRef.current.srcObject = streamInstance;
                
                // Ensure video is playing before attempting to decode
                await videoRef.current.play(); // Explicitly play

                if (codeReaderRef.current && videoRef.current && videoRef.current.readyState >= videoRef.current.HAVE_METADATA) {
                    codeReaderRef.current.decodeFromVideoElement(videoRef.current, async (result, err) => {
                        if (result) {
                            const scannedBarcode = result.getText();
                            form.setValue("barcode", scannedBarcode, { shouldValidate: true });
                            setIsCameraOpen(false); // Close camera UI first
                            await handleBarcodeFetch(scannedBarcode); // Then fetch data
                        }
                        if (err) {
                            if (err instanceof NotFoundException) {
                                // Normal, no barcode found yet
                            } else if (err.name === 'ChecksumException' || err.name === 'FormatException') {
                                // Can be ignored, common for partial scans
                            } else {
                                console.warn('Barcode decoding error:', err);
                                // setCameraError(`Scan Error: ${err.message}. Adjust position or lighting.`); // Potentially too noisy
                            }
                        }
                    }).catch(decodeErr => {
                        console.error("Error starting decodeFromVideoElement:", decodeErr);
                        setCameraError("Could not start barcode scanner. Try again or check camera.");
                        setIsCameraOpen(false);
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
    };
  }, [isCameraOpen, form, toast, handleBarcodeFetch]); 

  const toggleCameraScan = () => {
    const newCameraState = !isCameraOpen;
    setIsCameraOpen(newCameraState);
    if (newCameraState) { // If opening camera
        setCameraError(null); 
        // Clear previous barcode search states only if initiating a new scan
        setBarcodeError(null); 
        setBarcodeWarning(null);
        // Optionally clear barcode input when camera opens
        // form.setValue("barcode", "");
        // setLastFetchedBarcode(null);
    }
  };
  
  const handleFormSubmit = async (data: AllergenFormData) => {
    // `data` is from form.handleSubmit, reflecting current form state.
    // We need to get the latest values potentially after an async fetch.
    let currentBarcode = form.getValues("barcode")?.trim();
    let currentProductName = form.getValues("productName")?.trim();
    let currentIngredients = form.getValues("ingredients")?.trim();

    if (currentBarcode && (currentBarcode !== lastFetchedBarcode || !currentProductName || !currentIngredients)) {
        if (isLoading) return; // Prevent conflict with AI analysis loading state

        setIsFetchingBarcode(true);
        await handleBarcodeFetch(currentBarcode);
        setIsFetchingBarcode(false);
        
        // Re-fetch form values as they might have been updated by handleBarcodeFetch
        currentProductName = form.getValues("productName")?.trim();
        currentIngredients = form.getValues("ingredients")?.trim();
    }

    // Perform validation based on the (potentially) updated values
    let hasError = false;
    if (!currentProductName) {
        form.setError("productName", {type: "manual", message: "Product name is required. If using barcode, it might be missing or fetch failed."});
        hasError = true;
    } else {
        form.clearErrors("productName");
    }

    if (!currentIngredients) {
      form.setError("ingredients", { type: "manual", message: "Ingredients list is required. If using barcode, it might be missing from the database or fetch failed." });
      hasError = true;
    } else {
        form.clearErrors("ingredients");
    }
    
    if (hasError) {
        return;
    }
    
    // Use the most up-to-date form values for submission
    onSubmit(form.getValues());
  };


  return (
    <Card className="w-full max-w-lg mx-auto shadow-xl">
      <CardHeader className="text-center">
        <div className="flex justify-center items-center mb-4">
           <ChefHat size={48} className="text-primary" />
        </div>
        <CardTitle className="text-2xl font-bold">Check Product Allergens</CardTitle>
        <CardDescription>Scan a barcode or enter product details manually.</CardDescription>
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
                                placeholder="e.g., 1234567890123 or scan" 
                                {...field} 
                                disabled={isCameraOpen || isFetchingBarcode || isLoading} 
                            />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <Button type="button" onClick={toggleCameraScan} variant="outline" size="icon" aria-label={isCameraOpen ? "Stop Scanning" : "Scan with Camera"} disabled={isFetchingBarcode || isLoading}>
                        {isCameraOpen ? <VideoOff size={20} /> : <Camera size={20} />}
                    </Button>
                </div>
                {isFetchingBarcode && (
                    <div className="flex items-center text-sm text-muted-foreground pt-1">
                    <svg className="animate-spin mr-2 h-4 w-4 text-primary" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Fetching product info from Open Food Facts...
                    </div>
                )}
                {barcodeError && !isCameraOpen && ( // Only show if camera isn't the source of barcode input
                    <Alert variant="destructive" className="mt-2">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Barcode Lookup Failed</AlertTitle>
                        <AlertDescription>{barcodeError}</AlertDescription>
                    </Alert>
                )}
                {barcodeWarning && !isCameraOpen && !barcodeError && ( // Only show if camera isn't the source
                    <Alert variant="default" className="mt-2 border-yellow-500 text-yellow-700 dark:text-yellow-400 dark:border-yellow-700 [&>svg]:text-yellow-500 dark:[&>svg]:text-yellow-400">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Partial Product Info</AlertTitle>
                        <AlertDescription>{barcodeWarning}</AlertDescription>
                    </Alert>
                )}
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

            <FormField
              control={form.control}
              name="productName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2"><FileText size={18}/>Product Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Crunchy Peanut Butter" {...field} disabled={isFetchingBarcode || isCameraOpen || isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ingredients"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2"><ListChecks size={18}/>Ingredients List</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., Peanuts, Sugar, Salt. (Required if not found via barcode or if info is incomplete)"
                      className="min-h-[100px]"
                      {...field}
                      disabled={isFetchingBarcode || isCameraOpen || isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="productDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2"><Info size={18}/>Product Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., A delicious spread for sandwiches and snacks."
                      className="min-h-[80px]"
                      {...field}
                      disabled={isFetchingBarcode || isCameraOpen || isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isLoading || isFetchingBarcode || isCameraOpen}>
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Analyzing...
                </div>
              ) : isFetchingBarcode ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Fetching Product...
                </div>
              )
              : (
                <div className="flex items-center justify-center gap-2">
                  <Barcode size={20}/> Check Allergens
                </div>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
