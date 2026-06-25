import { ProductBaseType, ProductFormErrors } from '../types';

const MAX_PRODUCT_PRICE = 99999999;

export const productValidateForm = (
  formData: ProductBaseType,
  setErrors: (errors: ProductFormErrors) => void,
): boolean => {
  const newErrors: ProductFormErrors = {};

  const mrp = Number(formData.mrp);
  const rate = Number(formData.rate);
  const stock = Number(formData.stock);
  const conversionFactor = Number(formData.conversionFactor);

  if (!formData.name.trim()) {
    newErrors.name = 'Product name is required';
  }

  if (!Number.isFinite(mrp) || mrp <= 0) {
    newErrors.mrp = 'MRP must be greater than 0';
  } else if (mrp > MAX_PRODUCT_PRICE) {
    newErrors.mrp = `MRP cannot be greater than ${MAX_PRODUCT_PRICE}`;
  }

  if (!Number.isFinite(rate) || rate <= 0) {
    newErrors.rate = 'Rate must be greater than 0';
  } else if (rate > MAX_PRODUCT_PRICE) {
    newErrors.rate = `Rate cannot be greater than ${MAX_PRODUCT_PRICE}`;
  } else if (rate > mrp) {
    newErrors.rate = 'Rate cannot be greater than MRP';
  }

  if (!formData.taxRate || Number.isNaN(Number(formData.taxRate))) {
    newErrors.taxRate = 'Valid tax rate is required';
  }

  if (!Number.isFinite(stock) || stock < 0) {
    newErrors.stock = 'Stock cannot be negative';
  }

  if (formData.unitType === 'COMPOUND') {
    if (!Number.isFinite(conversionFactor) || conversionFactor <= 1) {
      newErrors.conversionFactor = 'Conversion factor must be greater than 1';
    }

    if (!Number.isInteger(conversionFactor)) {
      newErrors.conversionFactor = 'Conversion factor must be a whole number';
    }

    if (!formData.baseUnit) {
      newErrors.unit = 'Base unit is required';
    }

    if (formData.baseUnit === formData.unit) {
      newErrors.unit = 'Unit and base unit cannot be the same';
    }

    if (stock > 0 && stock * conversionFactor < 1) {
      newErrors.stock = `Stock too small for base unit conversion`;
    }
  }

  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};
