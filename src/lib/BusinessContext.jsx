import { createContext, useContext, useState, useEffect } from 'react';
import { GoogleGenerativeAI, auth } from '@/API/GoogleGenerativeAI';

const BusinessContext = createContext(null);

export function BusinessProvider({ children }) {
    const [businesses, setBusinesses] = useState([]);
    const [activeBusiness, setActiveBusiness] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(user => {
            if (user) {
                loadBusinesses();
            } else {
                setBusinesses([]);
                setActiveBusiness(null);
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, []);

    const loadBusinesses = async (retryCount = 0) => {
        try {
            setLoading(true);
            const data = await GoogleGenerativeAI.entities.Business.list('-created_at');
            
            // If data is empty but we have a user, retry once after 1s
            if ((!data || data.length === 0) && auth.currentUser && retryCount < 1) {
                setTimeout(() => loadBusinesses(retryCount + 1), 1000);
                return;
            }

            setBusinesses(data || []);
            
            const savedBusinessId = localStorage.getItem('last_active_business_id');
            if (data && data.length > 0) {
                const saved = data.find(b => b.id === savedBusinessId);
                setActiveBusiness(saved || data[0]);
            } else {
                setActiveBusiness(null);
            }
        } catch (error) {
            console.error("Failed to load businesses:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSetActiveBusiness = (business) => {
        setActiveBusiness(business);
        if (business) {
            localStorage.setItem('last_active_business_id', business.id);
        }
    };

    const refreshBusinesses = () => loadBusinesses();

    return (
        <BusinessContext.Provider value={{ 
            businesses, 
            activeBusiness, 
            setActiveBusiness: handleSetActiveBusiness, 
            loading, 
            refreshBusinesses 
        }}>
            {children}
        </BusinessContext.Provider>
    );
}

export function useBusiness() {
    const ctx = useContext(BusinessContext);
    if (!ctx) throw new Error('useBusiness must be used within BusinessProvider');
    return ctx;
}
