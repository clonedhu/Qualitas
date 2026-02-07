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
import { FollowUpProvider } from './context/FollowUpContext.tsx'
import { AuditProvider } from './context/AuditContext.tsx'
import { FATProvider } from './context/FATContext.tsx'
import { IAMProvider } from './context/IAMContext.tsx'

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
                      <FollowUpProvider>
                        <AuditProvider>
                          <FATProvider>
                            <IAMProvider>
                              <App />
                            </IAMProvider>
                          </FATProvider>
                        </AuditProvider>
                      </FollowUpProvider>
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
