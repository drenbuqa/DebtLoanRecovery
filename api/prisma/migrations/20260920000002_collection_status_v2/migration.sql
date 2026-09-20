-- Add KLIENT_I_RI and JURIDIKE values to CollectionStatus enum
ALTER TYPE "CollectionStatus" ADD VALUE IF NOT EXISTS 'KLIENT_I_RI';
ALTER TYPE "CollectionStatus" ADD VALUE IF NOT EXISTS 'JURIDIKE';
