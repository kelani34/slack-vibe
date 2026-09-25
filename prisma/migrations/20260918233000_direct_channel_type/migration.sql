-- Represent one-to-one direct conversations separately from private channels.
ALTER TYPE "ChannelType" ADD VALUE IF NOT EXISTS 'DIRECT';
