import React, { useState } from 'react';

const SimpleApp = () => {
  const [showBackgroundSettings, setShowBackgroundSettings] = useState(false);
  const [trackingMode, setTrackingMode] = useState('standard');
  const [isBackgroundTracking, setIsBackgroundTracking] = useState(false);

  const handleStart = () => {
    alert(`Started tracking in ${trackingMode} mode with background tracking ${isBackgroundTracking ? 'enabled' : 'disabled'}`);
    setShowBackgroundSettings(false);
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>HikerLink</h1>
      <p style={styles.subtitle}>Background Location Tracking Demo</p>
      
      {!showBackgroundSettings ? (
        <div style={styles.buttonContainer}>
          <button 
            style={styles.button}
            onClick={() => setShowBackgroundSettings(true)}
          >
            Start Tracking
          </button>
        </div>
      ) : (
        <div style={styles.settingsContainer}>
          <h2 style={styles.settingsTitle}>Tracking Settings</h2>
          
          <div style={styles.optionsContainer}>
            <p style={styles.optionTitle}>Select Tracking Mode:</p>
            
            <div style={styles.radioGroup}>
              <label style={styles.radioLabel}>
                <input 
                  type="radio" 
                  name="trackingMode" 
                  value="power-saving"
                  checked={trackingMode === 'power-saving'}
                  onChange={() => setTrackingMode('power-saving')}
                />
                Power Saving
              </label>
              <p style={styles.optionDescription}>
                Less frequent updates, better battery life
              </p>
            </div>
            
            <div style={styles.radioGroup}>
              <label style={styles.radioLabel}>
                <input 
                  type="radio" 
                  name="trackingMode" 
                  value="standard"
                  checked={trackingMode === 'standard'}
                  onChange={() => setTrackingMode('standard')}
                />
                Standard
              </label>
              <p style={styles.optionDescription}>
                Balanced accuracy and battery usage
              </p>
            </div>
            
            <div style={styles.radioGroup}>
              <label style={styles.radioLabel}>
                <input 
                  type="radio" 
                  name="trackingMode" 
                  value="high-accuracy"
                  checked={trackingMode === 'high-accuracy'}
                  onChange={() => setTrackingMode('high-accuracy')}
                />
                High Accuracy
              </label>
              <p style={styles.optionDescription}>
                More frequent updates, higher battery usage
              </p>
            </div>
          </div>
          
          <div style={styles.toggleContainer}>
            <label style={styles.toggleLabel}>
              <input 
                type="checkbox" 
                checked={isBackgroundTracking}
                onChange={() => setIsBackgroundTracking(!isBackgroundTracking)}
              />
              Enable Background Tracking
            </label>
            <p style={styles.optionDescription}>
              Keeps tracking your location even when the app is in the background
            </p>
          </div>
          
          <div style={styles.buttonRow}>
            <button 
              style={styles.cancelButton}
              onClick={() => setShowBackgroundSettings(false)}
            >
              Cancel
            </button>
            <button 
              style={styles.startButton}
              onClick={handleStart}
            >
              Start Tracking
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '500px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: 'Arial, sans-serif',
  },
  title: {
    fontSize: '28px',
    textAlign: 'center',
    color: '#27ae60',
    marginBottom: '10px',
  },
  subtitle: {
    fontSize: '16px',
    textAlign: 'center',
    color: '#555',
    marginBottom: '30px',
  },
  buttonContainer: {
    display: 'flex',
    justifyContent: 'center',
  },
  button: {
    backgroundColor: '#27ae60',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    fontSize: '16px',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  settingsContainer: {
    backgroundColor: '#f5f5f5',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  settingsTitle: {
    fontSize: '20px',
    marginBottom: '15px',
    textAlign: 'center',
    color: '#333',
  },
  optionsContainer: {
    marginBottom: '20px',
  },
  optionTitle: {
    fontWeight: 'bold',
    marginBottom: '10px',
  },
  radioGroup: {
    marginBottom: '10px',
    padding: '8px',
    backgroundColor: 'white',
    borderRadius: '4px',
    border: '1px solid #ddd',
  },
  radioLabel: {
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  optionDescription: {
    fontSize: '14px',
    color: '#666',
    marginTop: '5px',
    marginLeft: '25px',
  },
  toggleContainer: {
    marginBottom: '20px',
    padding: '15px',
    backgroundColor: 'white',
    borderRadius: '4px',
    border: '1px solid #ddd',
  },
  toggleLabel: {
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  buttonRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '10px',
  },
  cancelButton: {
    flex: 1,
    padding: '10px',
    backgroundColor: '#f2f2f2',
    border: '1px solid #ddd',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  startButton: {
    flex: 1,
    padding: '10px',
    backgroundColor: '#27ae60',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
};

export default SimpleApp;