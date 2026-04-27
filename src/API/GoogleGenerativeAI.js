import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * GoogleGenerativeAI.js — SlayCount API Client (Supabase Edition)
 * Berfungsi sebagai wrapper agar kode lama tetap jalan tapi data disimpan di Supabase.
 */
export const GoogleGenerativeAI = {
  auth: {
    me: async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) throw new Error('Not authenticated');
      return user;
    },
    login: async (email, password) => {
      return await supabase.auth.signInWithPassword({ email, password });
    },
    logout: async () => {
      await supabase.auth.signOut();
    }
  },

  entities: {
    Transaction: createSupabaseEntity('transactions'),
    Account: createSupabaseEntity('accounts'),
    Business: createSupabaseEntity('businesses'),
    JournalEntry: createSupabaseEntity('journal_entries'),
    FixedAsset: createSupabaseEntity('fixed_assets'),
    PeriodClosing: createSupabaseEntity('period_closings'),
  }
};

function createSupabaseEntity(tableName) {
  return {
    filter: async (criteria = {}, sort = '-created_at', limit = 100) => {
      let query = supabase.from(tableName).select('*');
      
      // Apply filters
      Object.entries(criteria).forEach(([key, value]) => {
        query = query.eq(key, value);
      });

      // Apply sorting
      const isDesc = sort.startsWith('-');
      const column = isDesc ? sort.substring(1) : sort;
      query = query.order(column, { ascending: !isDesc });

      // Apply limit
      query = query.limit(limit);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },

    get: async (id) => {
      const { data, error } = await supabase.from(tableName).select('*').eq('id', id).single();
      if (error) throw error;
      return data;
    },

    create: async (payload) => {
      const { data, error } = await supabase.from(tableName).insert([payload]).select().single();
      if (error) throw error;
      return data;
    },

    update: async (id, payload) => {
      const { data, error } = await supabase.from(tableName).update(payload).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },

    delete: async (id) => {
      const { error } = await supabase.from(tableName).delete().eq('id', id);
      if (error) throw error;
      return true;
    },

    bulkCreate: async (items) => {
      const { data, error } = await supabase.from(tableName).insert(items).select();
      if (error) throw error;
      return data;
    }
  };
}
