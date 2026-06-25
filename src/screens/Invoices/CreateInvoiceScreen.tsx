import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  FlatList,
  Alert,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  Button,
  TextInput,
  Card,
  IconButton,
  Divider,
  Portal,
  Modal,
  List,
  Searchbar,
  Checkbox,
} from 'react-native-paper';
import DatePicker from 'react-native-date-picker';
import {
  calculateItemAmount,
  calculateInvoiceTotals,
} from '../../utils/calculations';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CustomerType, DatePickerType, formTypeEnum, InvoiceBase, InvoiceForm, InvoiceItem, ProductType, RootStackParamList } from '../../types';
import { fetchProductsPage } from '../../apis/productApis';
import { fetchCustomersPage } from '../../apis/customerApis';
import { formatProductStock } from '../../utils/helper';
import { usePaginatedListQuery } from '../../hooks/usePaginatedListQuery';
import PaginationFooter from '../../components/common/PaginationFooter';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';

type AddCustomerScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList
>;

interface Props {
  navigation: AddCustomerScreenNavigationProp;
}

const CreateInvoiceScreen: React.FC<Props> = ({ navigation }) => {
  const [customer, setCustomer] = useState<CustomerType | null>(null);

  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [quantityDrafts, setQuantityDrafts] = useState<Record<string, string>>(
    {},
  );
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [datePickerType, setDatePickerType] =
    useState<DatePickerType>('invoice');

  const [showCustomerModal, setShowCustomerModal] = useState<boolean>(false);
  const [showProductModal, setShowProductModal] = useState<boolean>(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState<string>('');
  const [productSearchQuery, setProductSearchQuery] = useState<string>('');
  const debouncedCustomerSearchQuery = useDebouncedValue(customerSearchQuery, 350);
  const debouncedProductSearchQuery = useDebouncedValue(productSearchQuery, 350);
  const [form, setForm] = useState<InvoiceForm>({
    recievedAmount: '0',
    invoiceDate: new Date(),
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    discount: '0',
    discountType: 'FIXED-AMOUNT',
  });

  const {
    items: customers,
    isLoading: isCustomersLoading,
    isFetchingNextPage: isFetchingMoreCustomers,
    hasNextPage: hasMoreCustomers,
    fetchNextPage: fetchMoreCustomers,
  } = usePaginatedListQuery<CustomerType>({
    queryKey: ['invoice-customers'],
    queryFn: fetchCustomersPage,
    staleTime: 5 * 60 * 1000,
  });

  const {
    items: products,
    isLoading: isProductsLoading,
    isFetchingNextPage: isFetchingMoreProducts,
    hasNextPage: hasMoreProducts,
    fetchNextPage: fetchMoreProducts,
  } = usePaginatedListQuery<ProductType>({
    queryKey: ['invoice-products'],
    queryFn: fetchProductsPage,
    staleTime: 5 * 60 * 1000,
  });

  const trimmedCustomerSearch = customerSearchQuery.trim();
  const trimmedProductSearch = productSearchQuery.trim();
  const debouncedTrimmedCustomerSearch = debouncedCustomerSearchQuery.trim();
  const debouncedTrimmedProductSearch = debouncedProductSearchQuery.trim();

  const filteredCustomers = customers.filter(
    (c: CustomerType) =>
      c.name.toLowerCase().includes(trimmedCustomerSearch.toLowerCase()) ||
      c.mobile.includes(trimmedCustomerSearch),
  );

  const filteredProducts = products.filter((p: ProductType) =>
    p.name.toLowerCase().includes(trimmedProductSearch.toLowerCase()),
  );

  const shouldUseCustomerApiSearch =
    debouncedTrimmedCustomerSearch.length > 0 && filteredCustomers.length === 0;
  const shouldUseProductApiSearch =
    debouncedTrimmedProductSearch.length > 0 && filteredProducts.length === 0;

  const {
    items: searchedCustomers,
    isLoading: isCustomerSearchLoading,
    isFetchingNextPage: isFetchingMoreSearchedCustomers,
    hasNextPage: hasMoreSearchedCustomers,
    fetchNextPage: fetchMoreSearchedCustomers,
  } = usePaginatedListQuery<CustomerType>({
    queryKey: ['invoice-customers-search', debouncedTrimmedCustomerSearch],
    queryFn: params =>
      fetchCustomersPage({
        ...params,
        search: debouncedTrimmedCustomerSearch,
      }),
    staleTime: 30 * 1000,
    enabled: showCustomerModal && shouldUseCustomerApiSearch,
  });

  const {
    items: searchedProducts,
    isLoading: isProductSearchLoading,
    isFetchingNextPage: isFetchingMoreSearchedProducts,
    hasNextPage: hasMoreSearchedProducts,
    fetchNextPage: fetchMoreSearchedProducts,
  } = usePaginatedListQuery<ProductType>({
    queryKey: ['invoice-products-search', debouncedTrimmedProductSearch],
    queryFn: params =>
      fetchProductsPage({
        ...params,
        search: debouncedTrimmedProductSearch,
      }),
    staleTime: 30 * 1000,
    enabled: showProductModal && shouldUseProductApiSearch,
  });

  const visibleCustomers =
    trimmedCustomerSearch.length === 0
      ? customers
      : shouldUseCustomerApiSearch
        ? searchedCustomers
        : filteredCustomers;

  const visibleProducts =
    trimmedProductSearch.length === 0
      ? products
      : shouldUseProductApiSearch
        ? searchedProducts
        : filteredProducts;

  const isCustomerListLoading =
    isCustomersLoading || (shouldUseCustomerApiSearch && isCustomerSearchLoading);
  const isProductListLoading =
    isProductsLoading || (shouldUseProductApiSearch && isProductSearchLoading);

  const handleCustomerEndReached = () => {
    if (trimmedCustomerSearch.length > 0) {
      if (shouldUseCustomerApiSearch && hasMoreSearchedCustomers && !isFetchingMoreSearchedCustomers) {
        fetchMoreSearchedCustomers();
      }
      return;
    }

    if (shouldUseCustomerApiSearch) {
      if (hasMoreSearchedCustomers && !isFetchingMoreSearchedCustomers) {
        fetchMoreSearchedCustomers();
      }
      return;
    }

    if (hasMoreCustomers && !isFetchingMoreCustomers) {
      fetchMoreCustomers();
    }
  };

  const handleProductEndReached = () => {
    if (trimmedProductSearch.length > 0) {
      if (shouldUseProductApiSearch && hasMoreSearchedProducts && !isFetchingMoreSearchedProducts) {
        fetchMoreSearchedProducts();
      }
      return;
    }

    if (shouldUseProductApiSearch) {
      if (hasMoreSearchedProducts && !isFetchingMoreSearchedProducts) {
        fetchMoreSearchedProducts();
      }
      return;
    }

    if (hasMoreProducts && !isFetchingMoreProducts) {
      fetchMoreProducts();
    }
  };


  const selectCustomer = (selectedCustomer: CustomerType) => {
    setCustomer(selectedCustomer)
    setShowCustomerModal(false);
    setCustomerSearchQuery('');
  };

  const addProduct = (product: ProductType) => {
    const existingItem = items.find(item => item.productId === product.id);
    const initialBaseQty = 1;
    const maxAllowedForNewItem = Math.floor(Number.parseFloat(product.stock || '0') || 0);

    if (maxAllowedForNewItem < initialBaseQty) {
      Alert.alert('Out of stock', `${product.name} is out of stock`);
      return;
    }

    if (existingItem) {
      const currentInputQty = getInputQuantity(existingItem);
      updateQuantity(existingItem.productId, currentInputQty + 1);
    } else {
      const calc = calculateItemAmount(initialBaseQty, product.rate, product.taxRate);
      const newItem: InvoiceItem = {
        productId: product?.id,
        productName: product.name,
        quantity: initialBaseQty,
        mrp: product.mrp,
        sellingRate: product.rate,
        taxRate: product.taxRate,
        taxAmount: calc.taxAmount,
        amount: calc.totalAmount,
        unitType: product.unitType,
        unit: product.unit,
        baseUnit: product.baseUnit,
        conversionFactor: product.conversionFactor,
        stockInBase: product.stock,
        qtyInputUnit: 'BASE',
      };
      setItems([...items, newItem]);
    }
    setShowProductModal(false);
    setProductSearchQuery('');
  };

  const getMaxAllowedQuantityInBase = (item: InvoiceItem) => {
    const parsedStock = Number.parseFloat(item.stockInBase || '');
    if (Number.isNaN(parsedStock)) {
      return Number.MAX_SAFE_INTEGER;
    }

    const stockInBase = parsedStock;
    const conversionFactor = Number.parseFloat(item.conversionFactor || '1') || 1;

    return Math.floor(stockInBase);
  };

  const getQuantityUnitLabel = (item: InvoiceItem) => {
    if (item.unitType === 'COMPOUND' && item.qtyInputUnit === 'COMPOUND') {
      return item.unit || 'Unit';
    }
    return item.baseUnit || item.unit || 'Unit';
  };

  const toBaseQuantity = (item: InvoiceItem, inputQuantity: number) => {
    const conversionFactor = Number.parseFloat(item.conversionFactor || '1') || 1;
    if (item.unitType === 'COMPOUND' && item.qtyInputUnit === 'COMPOUND') {
      return inputQuantity * conversionFactor;
    }
    return inputQuantity;
  };

  const getInputQuantity = (item: InvoiceItem) => {
    const conversionFactor = Number.parseFloat(item.conversionFactor || '1') || 1;
    if (item.unitType === 'COMPOUND' && item.qtyInputUnit === 'COMPOUND') {
      return Number((item.quantity / conversionFactor).toFixed(2));
    }
    return item.quantity;
  };

  const getMaxAllowedInputQuantity = (item: InvoiceItem) => {
    const maxBase = getMaxAllowedQuantityInBase(item);
    const conversionFactor = Number.parseFloat(item.conversionFactor || '1') || 1;

    if (item.unitType === 'COMPOUND' && item.qtyInputUnit === 'COMPOUND') {
      return Math.floor(maxBase / conversionFactor);
    }
    return maxBase;
  };

  const getQuantityHint = (item: InvoiceItem) => {
    if (item.unitType !== 'COMPOUND') {
      return '';
    }

    const conversionFactor = Number.parseFloat(item.conversionFactor || '1') || 1;
    const unitLabel = item.unit || 'Unit';
    const baseUnitLabel = item.baseUnit || 'Base Unit';
    return `1 ${unitLabel} = ${conversionFactor} ${baseUnitLabel}`;
  };

  const updateQuantity = (
    productId: string,
    inputQuantity: number,
    showStockAlert: boolean = true,
  ) => {
    if (inputQuantity <= 0) {
      removeItem(productId);
      return;
    }

    setItems(
      items.map(item => {
        if (item.productId === productId) {
          const maxAllowed = getMaxAllowedInputQuantity(item);
          const sanitizedInputQuantity = Math.min(inputQuantity, maxAllowed || 0);
          const sanitizedBaseQuantity = toBaseQuantity(item, sanitizedInputQuantity);

          if (sanitizedInputQuantity <= 0 || sanitizedBaseQuantity <= 0) {
            if (showStockAlert) {
              Alert.alert('Out of stock', `${item.productName} is out of stock`);
            }
            return item;
          }

          if (showStockAlert && sanitizedInputQuantity < inputQuantity) {
            Alert.alert(
              'Stock limit',
              `Only ${maxAllowed} ${getQuantityUnitLabel(item)} available`,
            );
          }

          const calc = calculateItemAmount(
            sanitizedBaseQuantity,
            item.sellingRate,
            item.taxRate,
          );
          return {
            ...item,
            quantity: sanitizedBaseQuantity,
            taxAmount: calc.taxAmount,
            amount: calc.totalAmount,
          };
        }
        return item;
      }),
    );
  };

  const removeItem = (productId: string) => {
    setItems(items.filter(item => item.productId !== productId));
  };

  const updateItemQuantityUnit = (
    productId: string,
    qtyInputUnit: 'COMPOUND' | 'BASE',
  ) => {
    setItems(prev =>
      prev.map(item => {
        if (item.productId !== productId) {
          return item;
        }
        return { ...item, qtyInputUnit };
      }),
    );
    setQuantityDrafts(prev => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  };

  const handleQuantityTextChange = (productId: string, text: string) => {
    if (!/^\d*\.?\d*$/.test(text)) {
      return;
    }

    setQuantityDrafts(prev => ({ ...prev, [productId]: text }));
    if (!text) {
      return;
    }

    const qty = Number.parseFloat(text);
    if (!Number.isNaN(qty) && qty > 0) {
      updateQuantity(productId, qty, false);
    }
  };

  const handleQuantityBlur = (productId: string, currentQty: number) => {
    const draft = quantityDrafts[productId];
    if (draft === undefined) {
      return;
    }

    const qty = Number.parseFloat(draft);
    if (!draft || Number.isNaN(qty) || qty <= 0) {
      updateQuantity(productId, currentQty, false);
    } else {
      updateQuantity(productId, qty);
    }

    setQuantityDrafts(prev => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  };


  const totals = calculateInvoiceTotals(items, form.discount, form.discountType);
  const isDueDateBeforeInvoiceDate = () => {
    const invoiceDate = new Date(form.invoiceDate);
    const dueDate = new Date(form.dueDate);

    invoiceDate.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);

    return dueDate < invoiceDate;
  };

  const handlePreviewInvoice = () => {
    if (!customer) {
      Alert.alert('Error', 'Please select a customer');
      return;
    }

    if (items.length === 0) {
      Alert.alert('Error', 'Please add at least one product');
      return;
    }

    if (isDueDateBeforeInvoiceDate()) {
      Alert.alert('Invalid Due Date', 'Due date cannot be before invoice date');
      return;
    }

    const invoice: InvoiceBase = {
      customer,
      invoiceDate: form.invoiceDate,
      dueDate: form.dueDate,
      items,
      ...totals,
      receivedAmount: Number.parseFloat(form.recievedAmount) || 0,
      discountType: form.discountType,
      status:
        Number(form.recievedAmount) >= totals.totalAmount
          ? 'paid'
          : Number(form.recievedAmount) > 0
            ? 'partial'
            : 'pending',
    };
    navigation.navigate('InvoicePreview', { invoice, formType: formTypeEnum.ADD });
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Customer Selection */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Customer Details
            </Text>
            {customer ? (
              <View style={styles.customerInfo}>
                <View style={styles.customerDetails}>
                  <Text variant="bodyLarge">{customer.name}</Text>
                  <Text variant="bodySmall">{customer.mobile}</Text>
                  {!!customer.gst_number &&
                    <Text variant="bodySmall">{customer.gst_number}</Text>
                  }
                  {!!customer.address && (
                    <Text variant="bodySmall">{customer.address}</Text>
                  )}
                </View>
                <IconButton
                  icon="pencil"
                  onPress={() => setShowCustomerModal(true)}
                />
              </View>
            ) : (
              <Button
                mode="outlined"
                onPress={() => setShowCustomerModal(true)}
                icon="account-plus"
                loading={isCustomersLoading}
                disabled={isCustomersLoading}
              >
                {isCustomersLoading
                  ? 'Loading Customers...'
                  : 'Select Customer'}
              </Button>
            )}
          </Card.Content>
        </Card>

        {/* Dates */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.dateRow}>
              <View style={styles.dateField}>
                <Text variant="labelMedium">Invoice Date</Text>
                <TouchableOpacity
                  onPress={() => {
                    setDatePickerType('invoice');
                    setShowDatePicker(true);
                  }}
                >
                  <Text variant="bodyLarge" style={styles.dateText}>
                    {form.invoiceDate.toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.dateField}>
                <Text variant="labelMedium">Due Date</Text>
                <TouchableOpacity
                  onPress={() => {
                    setDatePickerType('due');
                    setShowDatePicker(true);
                  }}
                >
                  <Text variant="bodyLarge" style={styles.dateText}>
                    {form.dueDate.toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Items */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.itemsHeader}>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Items ({items.length})
              </Text>
              <Button
                mode="contained-tonal"
                icon="plus"
                onPress={() => setShowProductModal(true)}
              >
                Add Item
              </Button>
            </View>

            {items.map((item, index) => (
              <View key={item.productId}>
                <View style={styles.itemRow}>
                  <View style={styles.itemInfo}>
                    <View style={styles.itemTopRow}>
                      <Text
                        variant="bodyLarge"
                        numberOfLines={1}
                        ellipsizeMode="tail"
                        style={styles.itemName}
                      >
                        {item.productName}
                      </Text>
                      {item.unitType === 'COMPOUND' && (
                        <View style={styles.unitSwitchRow}>
                          <TouchableOpacity
                            onPress={() => updateItemQuantityUnit(item.productId, 'COMPOUND')}
                            style={[
                              styles.unitOption,
                              item.qtyInputUnit === 'COMPOUND' && styles.unitOptionSelected,
                            ]}
                          >
                            <View style={styles.unitCheckbox}>
                              <Checkbox
                                status={item.qtyInputUnit === 'COMPOUND' ? 'checked' : 'unchecked'}
                                onPress={() => updateItemQuantityUnit(item.productId, 'COMPOUND')}
                              />
                            </View>
                            <Text style={styles.unitOptionText}>{item.unit || 'Unit'}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => updateItemQuantityUnit(item.productId, 'BASE')}
                            style={[
                              styles.unitOption,
                              item.qtyInputUnit === 'BASE' && styles.unitOptionSelected,
                            ]}
                          >
                            <View style={styles.unitCheckbox}>
                              <Checkbox
                                status={item.qtyInputUnit === 'BASE' ? 'checked' : 'unchecked'}
                                onPress={() => updateItemQuantityUnit(item.productId, 'BASE')}
                              />
                            </View>
                            <Text style={styles.unitOptionText}>{item.baseUnit || 'Base'}</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                    <Text variant="bodySmall" style={styles.itemDetails}>
                      Rate: ₹{item.sellingRate} | Tax: {item.taxRate}%
                    </Text>
                    <Text variant="bodySmall" style={styles.itemStockText}>
                      Available: {getMaxAllowedInputQuantity(item)} {getQuantityUnitLabel(item)}
                    </Text>
                    {!!getQuantityHint(item) && (
                      <Text variant="bodySmall" style={styles.itemConversionText}>
                        {getQuantityHint(item)}
                      </Text>
                    )}
                  </View>

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.itemActions}
                  >
                    <View style={styles.qtyControl}>
                      <IconButton
                        icon="minus"
                        size={18}
                        onPress={() =>
                          updateQuantity(item.productId, item.quantity - 1)
                        }
                      />
                      <TextInput
                        mode="outlined"
                        dense
                        keyboardType="number-pad"
                        value={
                          quantityDrafts[item.productId] ??
                          String(getInputQuantity(item))
                        }
                        onChangeText={text =>
                          handleQuantityTextChange(item.productId, text)
                        }
                        onBlur={() =>
                          handleQuantityBlur(item.productId, item.quantity)
                        }
                        style={styles.quantityInput}
                        contentStyle={styles.quantityInputContent}
                      />
                      <IconButton
                        icon="plus"
                        size={18}
                        onPress={() =>
                          updateQuantity(item.productId, item.quantity + 1)
                        }
                      />
                    </View>

                    <View style={styles.metaCell}>
                      <Text style={styles.metaLabel}>Rate</Text>
                      <Text style={styles.metaValue}>₹{item.sellingRate}</Text>
                    </View>

                    <View style={styles.metaCell}>
                      <Text style={styles.metaLabel}>Tax</Text>
                      <Text style={styles.metaValue}>₹{item.taxAmount}</Text>
                    </View>

                    <View style={styles.metaCell}>
                      <Text style={styles.metaLabel}>Amount</Text>
                      <Text style={styles.metaValue}>₹{item.amount?.toFixed(2)}</Text>
                    </View>

                    <IconButton
                      icon="delete"
                      iconColor="#d32f2f"
                      size={20}
                      onPress={() => removeItem(item.productId)}
                    />
                  </ScrollView>
                </View>
                {index < items.length - 1 && <Divider />}
              </View>
            ))}

            {items.length === 0 && (
              <Text variant="bodyMedium" style={styles.emptyText}>
                No items added yet
              </Text>
            )}
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.discountHeader}>
              <Text variant="titleMedium" style={styles.discountTitle}>
                Discount
              </Text>
              <View style={styles.discountTypeRow}>
                <TouchableOpacity
                  style={[
                    styles.discountTypePill,
                    form.discountType === 'PERCENTAGE' && styles.discountTypePillActive,
                  ]}
                  onPress={() => setForm({ ...form, discountType: 'PERCENTAGE' })}
                >
                  <Text
                    style={[
                      styles.discountTypeText,
                      form.discountType === 'PERCENTAGE' && styles.discountTypeTextActive,
                    ]}
                  >
                    %
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.discountTypePill,
                    form.discountType === 'FIXED-AMOUNT' && styles.discountTypePillActive,
                  ]}
                  onPress={() => setForm({ ...form, discountType: 'FIXED-AMOUNT' })}
                >
                  <Text
                    style={[
                      styles.discountTypeText,
                      form.discountType === 'FIXED-AMOUNT' && styles.discountTypeTextActive,
                    ]}
                  >
                    ₹
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <TextInput
              label={
                form.discountType === 'PERCENTAGE'
                  ? 'Discount Percentage'
                  : 'Discount Amount'
              }
              value={form.discount}
              onChangeText={(text) => { setForm({ ...form, discount: text }) }}
              keyboardType="numeric"
              mode="outlined"
              style={styles.discountInput}
              right={
                <TextInput.Affix
                  text={form.discountType === 'PERCENTAGE' ? '%' : '₹'}
                />
              }
            />
          </Card.Content>
        </Card>

        {/* Totals */}
        {items.length > 0 && (
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.totalRow}>
                <Text variant="bodyMedium">Subtotal</Text>
                <Text variant="bodyMedium">₹{totals.subtotal?.toFixed(2)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text variant="bodyMedium">CGST</Text>
                <Text variant="bodyMedium">₹{totals.cgstTotal?.toFixed(2)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text variant="bodyMedium">SGST</Text>
                <Text variant="bodyMedium">₹{totals.sgstTotal?.toFixed(2)}</Text>
              </View>
              {totals.discountAmount > 0 && (
                <View style={styles.totalRow}>
                  <Text variant="bodyMedium">Discount ({form.discountType === 'PERCENTAGE' ? '%' : '₹'})</Text>
                  <Text variant="bodyMedium">₹{totals.discountAmount?.toFixed(2)}</Text>
                </View>
              )}
              <Divider style={styles.divider} />
              <View style={styles.totalRow}>
                <Text variant="titleLarge" style={styles.totalLabel}>
                  Total
                </Text>
                <Text variant="titleLarge" style={styles.totalAmount}>
                  ₹{totals.totalAmount?.toFixed(2)}
                </Text>
              </View>
              <TextInput
                label="Received Amount"
                value={form.recievedAmount}
                onChangeText={(text) => setForm({ ...form, recievedAmount: text })}
                keyboardType="numeric"
                mode="outlined"
                style={styles.receivedInput}
              />
            </Card.Content>
          </Card>
        )}

        <View style={styles.bottomSpace} />
      </ScrollView>

      {/* Save Button */}
      <View style={styles.footer}>
        <Button
          mode="contained"
          onPress={handlePreviewInvoice}
          disabled={!customer || items.length === 0}
          style={styles.saveButton}
        >
          Preview Invoice
        </Button>
      </View>

      {/* Customer Modal */}
      <Portal>
        <Modal
          visible={showCustomerModal}
          onDismiss={() => {
            setShowCustomerModal(false);
            setCustomerSearchQuery('');
          }}
          contentContainerStyle={styles.modal}
        >
          <Searchbar
            placeholder="Search customers"
            onChangeText={setCustomerSearchQuery}
            value={customerSearchQuery}
            style={styles.searchbar}
          />
          <FlatList
            data={visibleCustomers}
            keyExtractor={(item, index) => item.id || `customer-${index}`}
            style={styles.modalScroll}
            renderItem={({ item }) => (
              <List.Item
                title={item.name}
                description={`${item.mobile} - ${item.gst_number || 'N/A'}`}
                onPress={() => selectCustomer(item)}
              />
            )}
            onEndReached={handleCustomerEndReached}
            onEndReachedThreshold={0.3}
            ListFooterComponent={
              <PaginationFooter
                isLoading={
                  trimmedCustomerSearch.length > 0
                    ? shouldUseCustomerApiSearch && (isFetchingMoreSearchedCustomers || isCustomerSearchLoading)
                    : isFetchingMoreCustomers
                }
                hasNextPage={
                  trimmedCustomerSearch.length > 0
                    ? shouldUseCustomerApiSearch && Boolean(hasMoreSearchedCustomers)
                    : Boolean(hasMoreCustomers)
                }
              />
            }
            ListEmptyComponent={
              <Text variant="bodyMedium" style={styles.emptyText}>
                {isCustomerListLoading ? 'Loading customers...' : 'No customers found'}
              </Text>
            }
          />
        </Modal>
      </Portal>

      {/* Product Modal */}
      <Portal>
        <Modal
          visible={showProductModal}
          onDismiss={() => {
            setShowProductModal(false);
            setProductSearchQuery('');
          }}
          contentContainerStyle={styles.modal}
        >
          <Searchbar
            placeholder="Search products"
            onChangeText={setProductSearchQuery}
            value={productSearchQuery}
            style={styles.searchbar}
          />
          <FlatList
            data={visibleProducts}
            keyExtractor={(item, index) => item.id || `product-${index}`}
            style={styles.modalScroll}
            renderItem={({ item }) => {
              const displayStock = formatProductStock(item);
              const description = `Rate: ₹${item.rate} | Stock: ${displayStock}`;

              return (
                <List.Item
                  title={item.name}
                  description={description}
                  onPress={() => addProduct(item)}
                />
              );
            }}
            onEndReached={handleProductEndReached}
            onEndReachedThreshold={0.3}
            ListFooterComponent={
              <PaginationFooter
                isLoading={
                  trimmedProductSearch.length > 0
                    ? shouldUseProductApiSearch && (isFetchingMoreSearchedProducts || isProductSearchLoading)
                    : isFetchingMoreProducts
                }
                hasNextPage={
                  trimmedProductSearch.length > 0
                    ? shouldUseProductApiSearch && Boolean(hasMoreSearchedProducts)
                    : Boolean(hasMoreProducts)
                }
              />
            }
            ListEmptyComponent={
              <Text variant="bodyMedium" style={styles.emptyText}>
                {isProductListLoading ? 'Loading products...' : 'No products found'}
              </Text>
            }
          />
        </Modal>
      </Portal>

      {/* Date Picker */}
      <DatePicker
        modal
        open={showDatePicker}
        date={datePickerType === 'invoice' ? form.invoiceDate : form.dueDate}
        mode="date"
        minimumDate={datePickerType === 'due' ? form.invoiceDate : undefined}
        onConfirm={date => {
          setShowDatePicker(false);
          if (datePickerType === 'invoice') {
            const nextDueDate = form.dueDate < date ? date : form.dueDate;
            setForm({ ...form, invoiceDate: date, dueDate: nextDueDate });
          } else {
            setForm({ ...form, dueDate: date });
          }
        }}
        onCancel={() => setShowDatePicker(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  card: {
    margin: 12,
  },
  sectionTitle: {
    marginBottom: 12,
    fontWeight: 'bold',
  },
  customerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  customerDetails: {
    flex: 1,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateField: {
    flex: 1,
  },
  dateText: {
    marginTop: 4,
    color: '#2196F3',
  },
  itemsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemRow: {
    gap: 8,
    paddingVertical: 8,
  },
  itemInfo: {
    marginBottom: 2,
  },
  itemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  itemName: {
    flex: 1,
    paddingTop: 0,
    lineHeight: 20,
  },
  itemDetails: {
    color: '#666',
    marginTop: 1,
  },
  itemStockText: {
    color: '#666',
    marginTop: 1,
  },
  itemConversionText: {
    color: '#777',
    marginTop: 1,
    fontStyle: 'italic',
  },
  unitSwitchRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 0,
    flexShrink: 0,
    height: 24,
    alignItems: 'center',
  },
  unitOption: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    minWidth: 72,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    paddingRight: 6,
    height: 24,
  },
  unitOptionSelected: {
    borderColor: '#7b61ff',
    backgroundColor: '#f3efff',
  },
  unitOptionText: {
    fontSize: 11,
    lineHeight: 14,
    color: '#333',
    marginLeft: 4,
  },
  unitCheckbox: {
    margin: -6,
    transform: [{ scale: 0.72 }],
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 520,
    paddingRight: 4,
  },
  qtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    paddingHorizontal: 2,
    backgroundColor: '#fafafa',
  },
  metaCell: {
    minWidth: 100,
    borderWidth: 1,
    borderColor: '#ececec',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#fafafa',
  },
  metaLabel: {
    color: '#666',
    fontSize: 11,
  },
  metaValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  quantity: {
    minWidth: 24,
    textAlign: 'center',
  },
  quantityInput: {
    width: 64,
    height: 36,
    marginHorizontal: 2,
    backgroundColor: '#fff',
  },
  quantityInputContent: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  amount: {
    minWidth: 80,
    textAlign: 'right',
  },
  discountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  discountTitle: {
    fontWeight: 'bold',
  },
  discountTypeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  discountTypePill: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#d7d7d7',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  discountTypePillActive: {
    backgroundColor: '#ece5ff',
    borderColor: '#7b61ff',
  },
  discountTypeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#666',
  },
  discountTypeTextActive: {
    color: '#5b3fd1',
  },
  discountInput: {
    marginTop: 4,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    paddingVertical: 20,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  divider: {
    marginVertical: 8,
  },
  totalLabel: {
    fontWeight: 'bold',
  },
  totalAmount: {
    fontWeight: 'bold',
    color: '#2196F3',
  },
  receivedInput: {
    marginTop: 12,
  },
  footer: {
    padding: 12,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  saveButton: {
    paddingVertical: 6,
  },
  modal: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
    maxHeight: '80%',
  },
  searchbar: {
    marginBottom: 12,
  },
  modalScroll: {
    maxHeight: 400,
  },
  bottomSpace: {
    height: 20,
  },
});

export default CreateInvoiceScreen;
