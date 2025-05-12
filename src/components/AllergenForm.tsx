
"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Barcode, Info, ListChecks, ScanLine, FileText, ChefHat, AlertCircle, Camera, VideoOff } from 'lucide-react';
import { useEffect, useState, useCallback, useRef } from 'react';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
import { useToast } from "@/hooks/use-toast";

const allergenFormSchema = z.object({
  barcode: z.string().optional(),
  productName: z.string().optional(), // No longer strictly required if barcode fills it
  ingredients: z.string().min(1, { message: "Ingredients list is required if not found via barcode." }),
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
  const watchedBarcode = form.watch("barcode");

  // Camera scanning state
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const { toast } = useToast();


  const handleBarcodeFetch = useCallback(async (barcodeToFetch: string) => {
    if (!barcodeToFetch.trim()) {
      setBarcodeError(null); // Clear error if barcode is empty
      // Do not clear other fields here, allow manual entry
      return;
    }
    setIsFetchingBarcode(true);
    setBarcodeError(null);
    try {
      const response = await fetch(`/api/barcode?barcode=${barcodeToFetch}`);
      const data = await response.json();

      if (response.ok) {
        form.setValue("productName", data.productName || "", { shouldValidate: true });
        form.setValue("ingredients", data.ingredients || "", { shouldValidate: true });
        form.setValue("productDescription", data.productDescription || "", { shouldValidate: true });
        form.clearErrors("ingredients"); // Clear ingredients error if successfully fetched
      } else {
        setBarcodeError(data.error || "Failed to fetch barcode data. Please enter details manually.");
        // Do not clear fields here to allow manual correction or entry
      }
    } catch (error) {
      console.error("Error fetching barcode data:", error);
      setBarcodeError("An error occurred fetching barcode data. Please enter details manually.");
    } finally {
      setIsFetchingBarcode(false);
    }
  }, [form]);

  useEffect(() => {
    const currentBarcode = watchedBarcode?.trim();
    // Only fetch if barcode is not empty AND not currently being scanned by camera (to avoid race conditions)
    if (currentBarcode && !isCameraOpen) { 
      const handler = setTimeout(() => {
        handleBarcodeFetch(currentBarcode);
      }, 500); 

      return () => clearTimeout(handler);
    } else if (!currentBarcode) {
      setIsFetchingBarcode(false);
      setBarcodeError(null);
    }
  }, [watchedBarcode, handleBarcodeFetch, isCameraOpen]);


  // Effect for camera permission and stream setup
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
        setHasCameraPermission(null);
        return;
    }

    codeReaderRef.current = new BrowserMultiFormatReader();
    let streamInstance: MediaStream | null = null;

    const startScanning = async () => {
        setCameraError(null); // Clear previous errors
        try {
            streamInstance = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            setHasCameraPermission(true);

            if (videoRef.current && codeReaderRef.current) {
                videoRef.current.srcObject = streamInstance;
                // videoRef.current.play(); // autoPlay handles this
                
                // Wait for video to be ready to avoid errors
                videoRef.current.onloadedmetadata = () => {
                    if (codeReaderRef.current && videoRef.current) { // Check again due to async nature
                        codeReaderRef.current.decodeFromVideoElement(videoRef.current, (result, err) => {
                            if (result) {
                                form.setValue("barcode", result.getText(), { shouldValidate: true });
                                // `handleBarcodeFetch` will be triggered by the `watchedBarcode` useEffect
                                setIsCameraOpen(false); // Close camera on successful scan
                            }
                            if (err) {
                                if (err instanceof NotFoundException) {
                                    // Normal, no barcode found in this frame
                                } else if (err.name === 'ChecksumException' || err.name === 'FormatException') {
                                    // Common for blurry scans, can be ignored until a clear scan
                                } else {
                                    console.error('Barcode decoding error:', err);
                                    setCameraError(`Scan Error: ${err.message}. Adjust position or lighting.`);
                                }
                            }
                        }).catch(decodeErr => {
                            console.error("Error starting decodeFromVideoElement:", decodeErr);
                            setCameraError("Could not start barcode scanner. Please try again.");
                            setIsCameraOpen(false);
                        });
                    }
                };
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
  }, [isCameraOpen, form, toast]); 

  const toggleCameraScan = () => {
    setIsCameraOpen(prev => !prev);
    if (!isCameraOpen) { // If about to open camera
        setCameraError(null); // Clear previous errors when opening
        setBarcodeError(null); // Clear barcode input error
    }
  };
  
  const handleFormSubmit = (data: AllergenFormData) => {
    // If product name is empty but barcode is present, it implies barcode lookup might have failed
    // or user cleared it. Ingredients are key.
    if (!data.productName && data.barcode && !data.ingredients) {
      form.setError("ingredients", { type: "manual", message: "Ingredients are required if product details could not be fetched via barcode." });
      return;
    }
    // If no barcode, product name and ingredients are essential
    if (!data.barcode && (!data.productName || !data.ingredients)) {
        if (!data.productName) form.setError("productName", {type: "manual", message: "Product name is required if not using barcode."});
        if (!data.ingredients) form.setError("ingredients", {type: "manual", message: "Ingredients list is required."});
        return;
    }
    onSubmit(data);
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
                            <Input placeholder="e.g., 1234567890123 or scan" {...field} disabled={isCameraOpen || isFetchingBarcode} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <Button type="button" onClick={toggleCameraScan} variant="outline" size="icon" aria-label={isCameraOpen ? "Stop Scanning" : "Scan with Camera"} disabled={isFetchingBarcode}>
                        {isCameraOpen ? <VideoOff size={20} /> : <Camera size={20} />}
                    </Button>
                </div>
                {isFetchingBarcode && (
                    <div className="flex items-center text-sm text-muted-foreground">
                    <svg className="animate-spin mr-2 h-4 w-4 text-primary" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Fetching product info...
                    </div>
                )}
                 {barcodeError && !isCameraOpen && ( // Only show barcode input error if camera is not open
                    <Alert variant="destructive" className="mt-2">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Barcode Lookup Issue</AlertTitle>
                        <AlertDescription>{barcodeError}</AlertDescription>
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
                    {hasCameraPermission === false && !cameraError && ( // Show generic permission message if no specific error set
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Camera Access Required</AlertTitle>
                            <AlertDescription>
                                Please allow camera access in your browser settings to use the scanner.
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
                    <Input placeholder="e.g., Crunchy Peanut Butter" {...field} disabled={isFetchingBarcode || isCameraOpen} />
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
                      placeholder="e.g., Peanuts, Sugar, Salt. (Required if not found via barcode)"
                      className="min-h-[100px]"
                      {...field}
                      disabled={isFetchingBarcode || isCameraOpen}
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
                      disabled={isFetchingBarcode || isCameraOpen}
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
              ) : (
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
