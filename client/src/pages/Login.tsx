
import React from 'react';
import { LoginForm } from '@/components/auth/LoginForm';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { InfoIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

const Login = () => {
  const isDev = import.meta.env.DEV;
  
  return (
    <div className="w-full max-w-md mx-auto py-8 px-4">
      {isDev && (
        <Alert variant="default" className="mb-6 bg-muted/50">
          <InfoIcon className="h-4 w-4 mr-2" />
          <AlertDescription>
            Demo login: <strong>demo@example.com</strong> / <strong>password</strong>
          </AlertDescription>
        </Alert>
      )}
      
      <Alert variant="default" className="mb-6 border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/50">
        <InfoIcon className="h-4 w-4 text-blue-500" />
        <AlertTitle>New users</AlertTitle>
        <AlertDescription>
          If you don't have an account yet, please{' '}
          <Link to="/auth/register" className="font-medium underline hover:text-primary">
            register here
          </Link>{' '}
          first.
        </AlertDescription>
      </Alert>
      
      <LoginForm />
    </div>
  );
};

export default Login;
