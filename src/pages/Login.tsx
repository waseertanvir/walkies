import React, { useState } from 'react';
import logo from '../assets/Logo.png'

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => { };

  const handleSignUp = () => { };

  return (
    <div className="flex flex-col justify-center items-center h-full gap-20">
      
      <div>
        <img src={logo} className='max-w-[60%] h-auto mx-auto'></img>
        <h1 className='text-7xl text-white'>Walkies?</h1>
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
      </div>

      <div className='flex gap-5'>
        <button
          onClick={handleLogin}
          className='bg-worange rounded-2xl py-1.5 px-4'
        >
          Log in
        </button>
        <button
          onClick={handleSignUp}
          className='text-worange rounded-2xl py-1.5 px-4'
        >
          Sign Up
        </button>
      </div>

    </div>
  );
};