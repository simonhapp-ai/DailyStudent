-- Block II der Abiturnote: die 5 Abiturprüfungen, getrennt von den Block-I-Halbjahresnoten
-- (abi_halbjahre). Lebt in der gleichen dedizierten grade_data-Tabelle wie abi_halbjahre —
-- siehe CLAUDE.md "Grade Data Isolation": nie nur über profiles syncen.
ALTER TABLE grade_data
  ADD COLUMN IF NOT EXISTS abi_pruefungen JSONB DEFAULT '[]';
