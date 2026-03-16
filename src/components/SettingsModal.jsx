import { X, Save, Wallet, Settings } from 'lucide-react';
import { useState, useEffect } from 'react';
import './SettingsModal.css';

const SettingsModal = ({ isOpen, onClose, initialBalance, onSave }) => {
  const [balance, setBalance] = useState(initialBalance?.toString() || '10000');

  useEffect(() => {
    setBalance(initialBalance?.toString() || '10000');
  }, [initialBalance, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const num = parseFloat(balance);
    if (!isNaN(num) && num > 0) {
      onSave(num);
      onClose();
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <button 
          onClick={onClose}
          className="modal-close-btn"
          title="Cerrar"
        >
          <X size={20} />
        </button>
        
        <h2 className="modal-title">
          <Settings size={22} />
          Configuración
        </h2>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>
              <Wallet size={16} />
              Balance Inicial de la Cuenta
            </label>
            <div className="input-wrapper">
              <span className="input-prefix">$</span>
              <input 
                type="number" 
                step="any"
                min="1"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                className="modal-input"
                placeholder="10000"
                required
              />
            </div>
            <p className="input-hint">
              Este será el balance base para calcular el porcentaje de riesgo y beneficios.
            </p>
          </div>

          <div className="modal-footer">
            <button 
              type="button"
              onClick={onClose}
              className="btn-cancel"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              className="btn-save"
            >
              <Save size={16} />
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SettingsModal;