import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { LanguageProvider } from './context/LanguageContext.tsx'
import { AuthProvider } from './context/AuthContext.tsx'
import { ContractorsProvider } from './context/ContractorsContext.tsx'
import { NOIProvider } from './context/NOIContext.tsx'
import { ITPProvider } from './context/ITPContext.tsx'
import { NCRProvider } from './context/NCRContext.tsx'
import { ITRProvider } from './context/ITRContext.tsx'
import { PQPProvider } from './context/PQPContext.tsx'
import { OBSProvider } from './context/OBSContext.tsx'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LanguageProvider>
      <AuthProvider>
        <ContractorsProvider>
          <ITPProvider>
            <NOIProvider>
              <NCRProvider>
                <ITRProvider>
                  <PQPProvider>
                    <OBSProvider>
                      <App />
                    </OBSProvider>
                  </PQPProvider>
                </ITRProvider>
              </NCRProvider>
            </NOIProvider>
          </ITPProvider>
        </ContractorsProvider>
      </AuthProvider>
    </LanguageProvider>
  </React.StrictMode>,
)
