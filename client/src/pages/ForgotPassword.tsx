import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

const formSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
});

type FormValues = z.infer<typeof formSchema>;

const ForgotPasswordPage = () => {
  const { sendOtp } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    try {
      await sendOtp(data.email);
      setSuccess(true);
      toast.success("OTP sent successfully. Please check your email.");
      form.reset();
    } catch (error: any) {
      console.error('OTP send error:', error);
      toast.error('Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-md mx-auto">
      <div className="flex flex-col items-center space-y-2 mb-4">
        <h1 className="text-2xl font-bold">Reset your password</h1>
        <p className="text-muted-foreground text-center">
          Enter your email address and we'll send you an OTP to reset your password.
        </p>
      </div>

      {success ? (
        <div className="bg-green-100 border border-green-300 text-green-700 px-4 py-3 rounded-md">
          <p>OTP sent! Check your email for instructions.</p>
          <p className="mt-2 text-sm">
            Then, use the{' '}
            <Link to="/auth/reset-password" className="text-primary font-medium hover:underline">
              Reset Password
            </Link>{' '}
            page to enter the OTP and create a new password.
          </p>
        </div>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="email@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending OTP...
                </>
              ) : (
                'Send OTP'
              )}
            </Button>
          </form>
        </Form>
      )}

      <div className="text-center">
        <Link to="/auth/login" className="text-primary hover:underline inline-flex items-center">
          <ArrowLeft size={16} className="mr-1" />
          Back to login
        </Link>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
