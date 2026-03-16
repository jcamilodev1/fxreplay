import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import './Auth.css';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;
      setError('¡Registro exitoso! Revisa tu correo para confirmar la cuenta (si está activado).');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.message || 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card glass-blur animate-fade">
        <div className="auth-header">
          <h2>Crear Cuenta</h2>
          <p>Únete a FXReplay para simular tus trades</p>
        </div>
        {error && <div className="auth-error">{error}</div>}
        <form onSubmit={handleRegister} className="auth-form">
          <input 
            type="email" 
            placeholder="Correo electrónico" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
          />
          <input 
            type="password" 
            placeholder="Contraseña" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
          />
          <input 
            type="password" 
            placeholder="Confirmar Contraseña" 
            value={confirmPassword} 
            onChange={(e) => setConfirmPassword(e.target.value)} 
            required 
          />
          <button type="submit" disabled={loading} className="auth-btn">
            {loading ? 'Creando...' : 'Registrarse'}
          </button>
        </form>
        <div className="auth-footer">
          <span>¿Ya tienes cuenta? <Link to="/login">Inicia Sesión</Link></span>
        </div>
      </div>
    </div>
  );
}
