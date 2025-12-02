// Form validation utilities

export const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

export const validatePhone = (phone: string): boolean => {
    const phoneRegex = /^[0-9]{10,11}$/;
    const cleanedPhone = phone.replace(/[\s()-]/g, '');
    return phoneRegex.test(cleanedPhone);
};

export const validateRequired = (value: string): boolean => {
    return value.trim().length > 0;
};

export const validateMinLength = (value: string, minLength: number): boolean => {
    return value.trim().length >= minLength;
};

export const validateMaxLength = (value: string, maxLength: number): boolean => {
    return value.trim().length <= maxLength;
};
