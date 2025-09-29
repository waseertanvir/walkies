import React, { useState } from 'react';
import logo from '../assets/Logo.png'

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => { };

  const handleSignUp = () => { };

  return (
    <div className='max-w-100vw'>
      <img src={logo} className='max-w-[20%] h-auto'></img>
      <h2>Login</h2>
      <div>
        <label>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="mb-6">
        <label>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <div>
        <button
          onClick={handleLogin}
        >
          Go
        </button>
        <button
          onClick={handleSignUp}
        >
          Sign Up
        </button>
      </div>
    </div>
  );
};