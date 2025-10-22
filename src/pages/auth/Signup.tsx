import { useState } from 'react';
import logo from '../../assets/Logo.png'
import { supabase } from "../../supabaseClient";
import { useNavigate } from 'react-router';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [checkPass, setCheckPass] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSignUp = async () => {
    if (password !== checkPass) {
      console.log("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) {
        console.log(error.message);
        alert("Error creating account: " + error.message);
      } else {
        alert("Check your email for confirmation link");
        navigate('/login?message=check-email');
      }
    } catch (error) {
      console.error('Signup error:', error);
      alert('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };


  return (

    <div className="flex flex-col justify-center items-center h-full gap-20">

      <div>
        <img src={logo} className='max-w-[60%] h-auto mx-auto'></img>
        <h1 className='text-7xl text-white text-center'>Walkies?</h1>
      </div>
      <div className='flex flex-col gap-5'>
        <input
          type="email"
          value={email}
          placeholder='Email'
          onChange={(e) => setEmail(e.target.value)}
          className='bg-wsage py-1.5 px-4 rounded-md drop-shadow-2xl'
        />
        <input
          type="password"
          value={password}
          placeholder='Password'
          onChange={(e) => setPassword(e.target.value)}
          className='bg-wsage py-1.5 px-4 rounded-md drop-shadow-2xl'
        />
        <input
          type="password"
          value={checkPass}
          placeholder='Confirmation Password'
          onChange={(e) => setCheckPass(e.target.value)}
          className='bg-wsage py-1.5 px-4 rounded-md drop-shadow-2xl'
        />
      </div>

      <div className='flex gap-5'>
        <button
          onClick={handleSignUp}
          className='bg-worange rounded-2xl py-1.5 px-4 disabled:opacity-50'
          disabled={loading}
        >
          {loading ? 'Creating Account...' : 'Sign Up'}
        </button>
      </div>
    </div>
  );
};