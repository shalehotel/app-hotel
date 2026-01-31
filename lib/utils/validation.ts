export function isValidDNI(dni: string): boolean {
    return /^\d{8}$/.test(dni)
}

export function isValidRUC(ruc: string): boolean {
    // Debe tener 11 dígitos y el primer dígito debe ser 1 o 2
    if (!/^(1|2)\d{10}$/.test(ruc)) return false

    // Validación básica de primeros dígitos para RUCs comunes (10, 15, 17, 20)
    // Aunque hay otros que empiezan con 1 y 2, esta es una validación más estricta opcional
    // pero la regla general es 11 dígitos numéricos.
    // Para SUNAT, los prefijos válidos históricos son 10, 15, 17, 20.

    const prefix = ruc.substring(0, 2)
    const validPrefixes = ['10', '15', '17', '20']

    // Si queremos ser estrictos con los tipos de persona:
    if (!validPrefixes.includes(prefix)) {
        // Nota: Podrían existir nuevos rangos en el futuro, pero por ahora estos son los estándar.
        // Si queremos ser permisivos solo con longitud: return true
        return false
    }

    // Algoritmo de Módulo 11 para RUC (Opcional si queremos validación matemática real)
    // Por ahora la longitud y prefijo suele ser suficiente para UX rápida.
    return true
}

export function getDocumentError(type: string, value: string): string | null {
    if (!value) return null

    if (type === 'DNI') {
        if (!isValidDNI(value)) return 'El DNI debe tener 8 dígitos numéricos'
    }

    if (type === 'RUC') {
        if (!isValidRUC(value)) return 'El RUC debe tener 11 dígitos y comenzar con 10, 15, 17 o 20'
    }

    return null
}
