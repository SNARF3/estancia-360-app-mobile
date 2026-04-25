// hooks/breeding/breeding.types.ts

export type ServiceType = 'natural' | 'artificial_insemination' | 'embryo_transfer';
export type DiagnosisMethod = 'palpation' | 'ultrasound';
export type DiagnosisResult = 'pregnant' | 'empty';
export type BirthType = 'normal' | 'assisted' | 'cesarean';
export type CriaStatus = 'alive' | 'dead';
export type MotherCondition = 'good' | 'regular' | 'bad';
export type Destination = 'replacement' | 'fattening' | 'sale';

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
    natural: 'Monta Natural',
    artificial_insemination: 'Inseminación Artificial',
    embryo_transfer: 'Transferencia Embrionaria',
};

export const DIAGNOSIS_METHOD_LABELS: Record<DiagnosisMethod, string> = {
    palpation: 'Palpación',
    ultrasound: 'Ecografía',
};

export const DIAGNOSIS_RESULT_LABELS: Record<DiagnosisResult, string> = {
    pregnant: 'Preñada',
    empty: 'Vacía',
};

export const BIRTH_TYPE_LABELS: Record<BirthType, string> = {
    normal: 'Normal',
    assisted: 'Asistido',
    cesarean: 'Cesárea',
};

export const CRIA_STATUS_LABELS: Record<CriaStatus, string> = {
    alive: 'Viva',
    dead: 'Muerta',
};

export const MOTHER_CONDITION_LABELS: Record<MotherCondition, string> = {
    good: 'Buena',
    regular: 'Regular',
    bad: 'Mala',
};

export const DESTINATION_LABELS: Record<Destination, string> = {
    replacement: 'Reposición',
    fattening: 'Engorde',
    sale: 'Venta',
};

export const BODY_CONDITION_LABELS: Record<number, string> = {
    1: 'Muy Flaca',
    2: 'Flaca',
    3: 'Normal',
    4: 'Gorda',
    5: 'Muy Gorda',
};