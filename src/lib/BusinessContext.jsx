import { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const BusinessContext = createContext(null);

export function BusinessProvider({ children }) {
    const [businesses, setBusinesses] = useState([]);
    const [activeBusiness, setActiveBusiness] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadBusinesses();
    }, []);

    const loadBusinesses = async () => {
        setLoading(true);
        const data = await base44.entities.Business.list('-created_date');
        setBusinesses(data);
        if (data.length > 0 && !activeBusiness) {
            setActiveBusiness(data[0]);
        }
        setLoading(false);
    };

    const refreshBusinesses = () => loadBusinesses();

    return (
        <BusinessContext.Provider value={{ businesses, activeBusiness, setActiveBusiness, loading, refreshBusinesses }}>
            {children}
        </BusinessContext.Provider>
    );
}

export function useBusiness() {
    const ctx = useContext(BusinessContext);
    if (!ctx) throw new Error('useBusiness must be used within BusinessProvider');
    return ctx;
}
