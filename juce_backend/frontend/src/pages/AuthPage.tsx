import React from 'react';
import { SignIn, SignUp } from '@clerk/clerk-react';

type Props = { mode: 'sign-in' | 'sign-up' };

const AuthPage: React.FC<Props> = ({ mode }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-daw-background">
      <div className="p-6 bg-daw-surface border border-daw-border rounded shadow-md">
        {mode === 'sign-in' ? <SignIn routing="path" path="/sign-in" /> : <SignUp routing="path" path="/sign-up" />}
      </div>
    </div>
  );
};

export default AuthPage;

