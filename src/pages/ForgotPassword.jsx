import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import './Auth.css';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;
      setMessage('¡Correo enviado! Revisa tu bandeja de entrada para restablecer la contraseña.');
    } catch (err) {
      setError(err.message || 'Error al enviar el correo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card glass-blur animate-fade">
        <div className="auth-header">
          <h2>Recuperar Contraseña</h2>
          <p>Ingresa tu correo para recibir un enlace de restablecimiento</p>
        </div>
        {error && <div className="auth-error">{error}</div>}
        {message && <div className="auth-success" style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)', color: '#4ade80', padding: '10px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', textAlign: 'center' }}>{message}</div>}
        <form onSubmit={handleReset} className="auth-form">
          <input 
            type="email" 
            placeholder="Correo electrónico" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
          />
          <button type="submit" disabled={loading} className="auth-btn">
            {loading ? 'Enviando...' : 'Enviar Enlace'}
          </button>
        </form>
        <div className="auth-footer">
          <span><Link to="/login">Volver al Inicio</Link></span>
        </div>
      </div>
    </div>
  );
}
