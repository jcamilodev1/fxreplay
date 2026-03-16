import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import './Auth.css';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;
      navigate('/login');
    } catch (err) {
      setError(err.message || 'Error al actualizar contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card glass-blur animate-fade">
        <div className="auth-header">
          <h2>Nueva Contraseña</h2>
          <p>Ingresa tu nueva contraseña para acceder</p>
        </div>
        {error && <div className="auth-error">{error}</div>}
        <form onSubmit={handleUpdate} className="auth-form">
          <input 
            type="password" 
            placeholder="Nueva Contraseña" 
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
            {loading ? 'Actualizando...' : 'Restablecer'}
          </button>
        </form>
      </div>
    </div>
  );
}
