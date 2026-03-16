import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import './Auth.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      navigate('/');
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card glass-blur animate-fade">
        <div className="auth-header">
          <h2>Bienvenido de Nuevo</h2>
          <p>Inicia sesión en FXReplay para continuar</p>
        </div>
        {error && <div className="auth-error">{error}</div>}
        <form onSubmit={handleLogin} className="auth-form">
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
          <button type="submit" disabled={loading} className="auth-btn">
            {loading ? 'Entrando...' : 'Iniciar Sesión'}
          </button>
        </form>
        <div className="auth-footer">
          <div>¿No tienes cuenta? <Link to="/register">Regístrate</Link></div>
          <div style={{ marginTop: '10px' }}><Link to="/forgot-password" style={{ color: '#94a3b8', fontSize: '12px' }}>¿Olvidaste tu contraseña?</Link></div>
        </div>
      </div>
    </div>
  );
}
