export interface ATM {
  id: string;
  bankName: string;
  locationName: string;
  address?: string;
  latitude: number;
  longitude: number;
  status: 'disponivel' | 'sem_dinheiro' | 'sem_papel' | 'fora_de_servico';
  lastReportedAt: any;
  notes?: string;
}
