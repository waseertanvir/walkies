import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className = '', onClick }: CardProps) {
  return (
    <div 
      className={`bg-wolive rounded-lg shadow-md p-4 ${onClick ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

interface StatusPillProps {
  status: string;
  className?: string;
}

export function StatusPill({ status, className = '' }: StatusPillProps) {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'pending': return 'bg-wyellow text-wblue';
      case 'accepted': return 'bg-wolive text-white';
      case 'in_progress': return 'bg-worange text-white';
      case 'completed': return 'bg-wsage text-white';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)} ${className}`}>
      {status.replace('_', ' ').toUpperCase()}
    </span>
  );
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold text-wblue">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ×
          </button>
        </div>
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  );
}

interface FloatingActionButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}

export function FloatingActionButton({ onClick, children, className = '' }: FloatingActionButtonProps) {
  return (
    <>
      <button
        onClick={onClick}
        className={`fixed z-40 bg-worange text-white shadow-lg hover:shadow-xl transition-all duration-200 ${className}`}
      >
        {children}
      </button>
    </>
  );
}

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

export function Button({ 
  children, 
  onClick, 
  variant = 'primary', 
  size = 'md', 
  disabled = false,
  className = '',
  type = 'button'
}: ButtonProps) {
  const getVariantClasses = () => {
    switch (variant) {
      case 'primary': return 'bg-worange text-white hover:bg-orange-600';
      case 'secondary': return 'bg-wsage text-white hover:bg-green-600';
      case 'danger': return 'bg-red-500 text-white hover:bg-red-600';
      default: return 'bg-worange text-white hover:bg-orange-600';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm': return 'px-3 py-1.5 text-sm';
      case 'md': return 'px-4 py-2 text-base';
      case 'lg': return 'px-6 py-3 text-lg';
      default: return 'px-4 py-2 text-base';
    }
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${getVariantClasses()} ${getSizeClasses()} ${className}`}
    >
      {children}
    </button>
  );
}
