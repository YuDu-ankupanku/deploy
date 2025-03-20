
import React from 'react';
import RegisterForm from '@/components/auth/RegisterForm';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Link } from 'react-router-dom';
import { InfoIcon } from 'lucide-react';

const Register = () => {
  return (
    <div className="w-full max-w-md mx-auto py-8 px-4">
      <Alert variant="default" className="mb-6 border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/50">
        <InfoIcon className="h-4 w-4 text-blue-500" />
        <AlertDescription>
          Already have an account?{' '}
          <Link to="/auth/login" className="font-medium underline hover:text-primary">
            Log in here
          </Link>
        </AlertDescription>
      </Alert>
      
      <RegisterForm />
    </div>
  );
};

export default Register;
