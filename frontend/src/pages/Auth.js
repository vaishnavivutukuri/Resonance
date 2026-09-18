import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from '../components/common/Button';
import { toast } from '../components/common/Toast';
import './Auth.css';

export default function Auth() {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  });

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        await login(formData.username, formData.password);
        toast('Welcome back to Resonance!', 'success');
      } else {
        await register(formData.username, formData.email, formData.password);
        toast('Account created successfully!', 'success');
      }
      navigate('/');
    } catch (err) {
      toast(err.response?.data?.detail || 'Authentication failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card animate-scale-in">
        <div className="auth-logo">
          <div className="auth-logo-icon">♫</div>
          <h1>Resonance</h1>
        </div>
        
        <p className="auth-subtitle">
          {isLogin ? 'Sign in to continue your journey' : 'Create an account to start playing'}
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <input 
              type="text" 
              name="username"
              className="input" 
              value={formData.username}
              onChange={handleChange}
              required 
            />
          </div>

          {!isLogin && (
            <div className="form-group animate-fade-in">
              <label>Email</label>
              <input 
                type="email" 
                name="email"
                className="input" 
                value={formData.email}
                onChange={handleChange}
                required 
              />
            </div>
          )}

          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" 
              name="password"
              className="input" 
              value={formData.password}
              onChange={handleChange}
              required 
            />
          </div>

          <Button type="submit" variant="primary" fullWidth size="lg" loading={loading} style={{ marginTop: '1rem' }}>
            {isLogin ? 'Sign In' : 'Sign Up'}
          </Button>
        </form>

        <div className="auth-toggle">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button 
            type="button"
            className="auth-toggle-btn"
            onClick={() => setIsLogin(!isLogin)}
          >
            {isLogin ? 'Sign Up' : 'Sign In'}
          </button>
        </div>
      </div>
    </div>
  );
}
