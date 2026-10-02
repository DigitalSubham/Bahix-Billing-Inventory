// src/screens/customers/AddCustomerScreen.tsx
import React, { useState, useEffect } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    Alert,
    TouchableOpacity,
} from 'react-native';
import {
    TextInput,
    Button,
    Text,
    Card,
    HelperText,
    Divider,
    Chip,
} from 'react-native-paper';
import AppDropdownPicker from '../../components/common/Dropdown';
import { useBusinessCategory } from '../../hooks/useBusinessCategory';
import { hasPartyField } from '../../constants/categoryFields';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, FormErrors, CustomerBaseType, CustomerType, formTypeEnum } from '../../types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createCustomers, fetchCustomersById, updateCustomers } from '../../apis/customerApis';
import { validateForm } from '../../utils/validators';
import { STATE_OPTIONS } from '../../constants/state';
import MaterialDesignIcons from '@react-native-vector-icons/material-design-icons';

type AddCustomerScreenNavigationProp = NativeStackNavigationProp<
    RootStackParamList>;

interface Props {
    navigation: AddCustomerScreenNavigationProp;
    route: {
        params: { customerId?: string, formType: formTypeEnum };
    }

}

const CUSTOMER_TYPES = ['Regular', 'Wholesale', 'Retail', 'Distributor'];

const AddCustomerScreen = ({ navigation, route }: Props) => {
    const isEditMode = route?.params?.customerId !== undefined;
    const customerId = route?.params?.customerId;

    const existingCustomer = useQuery({
        queryKey: ['customers', customerId],
        queryFn: () => fetchCustomersById(customerId!),
        enabled: isEditMode && !!customerId,
    })

    const [formData, setFormData] = useState<CustomerBaseType>({
        name: '',
        mobile: '',
        email: '',
        address: '',
        city: '',
        state: 'Bihar',
        pincode: '',
        gst_number: '',
        placeOfSupply: 'Bihar',
        customerType: 'Regular',
        creditLimit: '0',
        notes: '',
        dlNo: '',
        fssaiNo: '',
        uid: '',
        stateCode: '',
        beat: '',
    });

    const businessCategory = useBusinessCategory();
    const showLicenceFields = hasPartyField(businessCategory, 'dlNo');
    const [errors, setErrors] = useState<FormErrors>({});
    const [showAdvanced, setShowAdvanced] = useState(false);
    const queryClient = useQueryClient();
    const createProductMutation = useMutation({
        mutationFn: (newCustomer: CustomerBaseType) => createCustomers(newCustomer),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['customers'] });
        },
        onError: (error) => {
            Alert.alert('Error', error.message || 'Failed to save invoice');
        },
    })
    const updateProductMutation = useMutation({
        mutationFn: ({ id, customerData }: {
            id: string;
            customerData: CustomerType;
        }) => updateCustomers(id, customerData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['customers'] });
        },
        onError: (error) => {
            Alert.alert('Error', error.message || 'Failed to save invoice');
        },
    })


    useEffect(() => {
        if (isEditMode && existingCustomer.data) {
            setFormData({
                name: existingCustomer.data.name,
                mobile: existingCustomer.data.mobile,
                email: existingCustomer.data.email || '',
                address: existingCustomer.data.address || '',
                city: existingCustomer.data.city || '',
                state: existingCustomer.data.state || 'Bihar',
                pincode: existingCustomer.data.pincode || '',
                gst_number: existingCustomer.data.gst_number || '',
                placeOfSupply: existingCustomer.data.placeOfSupply || 'Bihar',
                customerType: existingCustomer.data.customerType || 'Regular',
                creditLimit: existingCustomer.data.creditLimit?.toString() || '0',
                notes: existingCustomer.data.notes || '',
                dlNo: existingCustomer.data.dl_no || existingCustomer.data.dlNo || '',
                fssaiNo: existingCustomer.data.fssai_no || existingCustomer.data.fssaiNo || '',
                uid: existingCustomer.data.uid || '',
                stateCode: existingCustomer.data.state_code || existingCustomer.data.stateCode || '',
                beat: existingCustomer.data.beat || '',
            });
        }
    }, [isEditMode, existingCustomer.data]);

    useEffect(() => {
        navigation.setOptions({
            title: isEditMode ? 'Edit Customer' : 'Add Customer',
        });
    }, [isEditMode, navigation]);



    const handleSubmit = () => {
        if (!validateForm(formData, setErrors)) {
            return;
        }

        const customerData = {
            id: isEditMode ? customerId! : Date.now().toString(),
            name: formData.name.trim(),
            mobile: formData.mobile.trim(),
            email: formData.email.trim(),
            address: formData.address.trim(),
            gst_number: formData.gst_number.trim(),
            placeOfSupply: formData.placeOfSupply,
            city: formData.city,
            state: formData.state,
            pincode: formData.pincode,
            customerType: formData.customerType,
            creditLimit: formData.creditLimit,
            notes: formData.notes,
            dl_no: formData.dlNo,
            fssai_no: formData.fssaiNo,
            uid: formData.uid,
            state_code: formData.stateCode,
            beat: formData.beat,
        };

        if (isEditMode) {
            updateProductMutation.mutate({ id: customerId!, customerData }, {
                onSuccess: () => {
                    Alert.alert('Success', 'Customer updated successfully', [
                        { text: 'OK', onPress: () => navigation.goBack() },
                    ]);
                }
            })

        } else {
            createProductMutation.mutate(customerData, {
                onSuccess: () => {
                    Alert.alert('Success', 'Customer added successfully', [
                        {
                            text: 'Add Another',
                            onPress: () => {
                                setFormData({
                                    name: '',
                                    mobile: '',
                                    email: '',
                                    address: '',
                                    city: '',
                                    state: 'Bihar',
                                    pincode: '',
                                    gst_number: '',
                                    placeOfSupply: 'Bihar',
                                    customerType: 'Regular',
                                    creditLimit: '0',
                                    notes: '',
                                    dlNo: '',
                                    fssaiNo: '',
                                    uid: '',
                                    stateCode: '',
                                    beat: '',
                                });
                                setErrors({});
                            },
                        },
                        { text: 'Done', onPress: () => navigation.goBack() },
                    ]);
                }
            })

        }
    };

    const handleDelete = () => {
        Alert.alert(
            'Delete Customer',
            'Are you sure you want to delete this customer?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        navigation.goBack();
                    },
                },
            ]
        );
    };

    const updateFormData = (field: keyof CustomerType, value: string) => {
        setFormData({ ...formData, [field]: value });
        if (errors[field as keyof FormErrors]) {
            setErrors({ ...errors, [field]: undefined });
        }
    };

    return (
        <View style={styles.container}>
            <ScrollView>
                {/* Basic Information */}
                <Card style={styles.card}>
                    <Card.Content>
                        <Text variant="titleMedium" style={styles.sectionTitle}>
                            Basic Information
                        </Text>

                        <TextInput
                            label="Customer Name *"
                            value={formData.name}
                            onChangeText={(text) => updateFormData('name', text)}
                            mode="outlined"
                            style={styles.input}
                            error={!!errors.name}
                            placeholder="Enter customer name"
                        />
                        {errors.name && (
                            <HelperText type="error" visible={!!errors.name}>
                                {errors.name}
                            </HelperText>
                        )}

                        <TextInput
                            label="Mobile Number *"
                            value={formData.mobile}
                            onChangeText={(text) => updateFormData('mobile', text)}
                            mode="outlined"
                            keyboardType="phone-pad"
                            maxLength={10}
                            style={styles.input}
                            error={!!errors.mobile}
                            left={<TextInput.Affix text="+91" />}
                        />
                        {errors.mobile && (
                            <HelperText type="error" visible={!!errors.mobile}>
                                {errors.mobile}
                            </HelperText>
                        )}

                        <TextInput
                            label="Email Address"
                            value={formData.email}
                            onChangeText={(text) => updateFormData('email', text)}
                            mode="outlined"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            style={styles.input}
                            error={!!errors.email}
                            placeholder="customer@example.com"
                        />
                        {errors.email && (
                            <HelperText type="error" visible={!!errors.email}>
                                {errors.email}
                            </HelperText>
                        )}

                        {/* Customer Type */}
                        <Text variant="labelLarge" style={styles.label}>
                            Customer Type
                        </Text>
                        <View style={styles.chipContainer}>
                            {CUSTOMER_TYPES.map((type) => (
                                <Chip
                                    key={type}
                                    selected={formData.customerType === type}
                                    onPress={() => updateFormData('customerType', type)}
                                    style={styles.chip}
                                    mode={formData.customerType === type ? 'flat' : 'outlined'}>
                                    {type}
                                </Chip>
                            ))}
                        </View>
                    </Card.Content>
                </Card>

                {/* Address Details */}
                <Card style={styles.card}>
                    <Card.Content>
                        <Text variant="titleMedium" style={styles.sectionTitle}>
                            Address Details
                        </Text>

                        <TextInput
                            label="Address"
                            value={formData.address}
                            onChangeText={(text) => updateFormData('address', text)}
                            mode="outlined"
                            multiline
                            numberOfLines={3}
                            style={styles.input}
                            placeholder="Street, Area, Landmark"
                        />

                        <View style={styles.row}>
                            <View style={styles.halfWidth}>
                                <TextInput
                                    label="City"
                                    value={formData.city}
                                    onChangeText={(text) => updateFormData('city', text)}
                                    mode="outlined"
                                    style={styles.input}
                                />
                            </View>

                            <View style={styles.halfWidth}>
                                <TextInput
                                    label="Pincode"
                                    value={formData.pincode}
                                    onChangeText={(text) => updateFormData('pincode', text)}
                                    mode="outlined"
                                    keyboardType="numeric"
                                    maxLength={6}
                                    style={styles.input}
                                    error={!!errors.pincode}
                                />
                            </View>
                        </View>
                        {errors.pincode && (
                            <HelperText type="error" visible={!!errors.pincode}>
                                {errors.pincode}
                            </HelperText>
                        )}
                        <AppDropdownPicker
                            label="State*"
                            value={formData.state}
                            items={STATE_OPTIONS.map((state) => ({ label: state.label, value: state.value }))}
                            onChange={(value) => updateFormData('state', value)}
                            // error={errors.state}
                            zIndex={2000}
                            searchable={true}
                        />

                    </Card.Content>
                </Card>

                {/* Business Details */}
                <Card style={styles.card}>
                    <Card.Content>
                        <Text variant="titleMedium" style={styles.sectionTitle}>
                            Business Details
                        </Text>

                        <TextInput
                            label="gst_number"
                            value={formData.gst_number}
                            onChangeText={(text) =>
                                updateFormData('gst_number', text.toUpperCase())
                            }
                            mode="outlined"
                            autoCapitalize="characters"
                            maxLength={15}
                            style={styles.input}
                            error={!!errors.gst_number}
                            placeholder="22AAAAA0000A1Z5"
                        />
                        {errors.gst_number && (
                            <HelperText type="error" visible={!!errors.gst_number}>
                                {errors.gst_number}
                            </HelperText>
                        )}
                        <HelperText type="info">
                            Leave empty if customer doesn't have gst_number
                        </HelperText>
                        <AppDropdownPicker
                            label="Place of Supply *"
                            value={formData.state}
                            items={STATE_OPTIONS.map((state) => ({ label: state.label, value: state.value }))}
                            onChange={(value) => updateFormData('placeOfSupply', value)}
                            // error={errors.state}
                            zIndex={2000}
                            searchable={true}
                        />

                        <HelperText type="info">
                            Used for GST calculation on invoices
                        </HelperText>

                        {showLicenceFields && (
                            <>
                                <TextInput
                                    label="State Code"
                                    value={formData.stateCode}
                                    onChangeText={(text) => updateFormData('stateCode', text)}
                                    mode="outlined"
                                    keyboardType="numeric"
                                    maxLength={2}
                                    style={styles.input}
                                    placeholder="e.g., 10"
                                />

                                <TextInput
                                    label="Drug Licence No. (D.L.No.)"
                                    value={formData.dlNo}
                                    onChangeText={(text) => updateFormData('dlNo', text.toUpperCase())}
                                    mode="outlined"
                                    autoCapitalize="characters"
                                    style={styles.input}
                                />

                                <TextInput
                                    label="FSSAI Licence No."
                                    value={formData.fssaiNo}
                                    onChangeText={(text) => updateFormData('fssaiNo', text)}
                                    mode="outlined"
                                    keyboardType="numeric"
                                    style={styles.input}
                                />

                                <TextInput
                                    label="UID"
                                    value={formData.uid}
                                    onChangeText={(text) => updateFormData('uid', text)}
                                    mode="outlined"
                                    style={styles.input}
                                />

                                <TextInput
                                    label="BEAT / Route"
                                    value={formData.beat}
                                    onChangeText={(text) => updateFormData('beat', text)}
                                    mode="outlined"
                                    style={styles.input}
                                    placeholder="e.g., Sundry Debtors"
                                />
                            </>
                        )}
                    </Card.Content>
                </Card>

                {/* Advanced Settings */}
                <Card style={styles.card}>
                    <Card.Content>
                        <TouchableOpacity
                            style={styles.advancedHeader}
                            onPress={() => setShowAdvanced(!showAdvanced)}>
                            <Text variant="titleMedium" style={styles.sectionTitle}>
                                Advanced Settings
                            </Text>
                            <MaterialDesignIcons
                                name={showAdvanced ? 'chevron-down' : 'chevron-right'}
                                size={20}
                                color={'#2196F3'}
                            />
                        </TouchableOpacity>

                        <View style={{ display: showAdvanced ? 'flex' : 'none' }}>
                            <Divider style={styles.divider} />

                            <TextInput
                                label="Credit Limit"
                                value={formData.creditLimit}
                                onChangeText={(text) => updateFormData('creditLimit', text)}
                                mode="outlined"
                                keyboardType="decimal-pad"
                                style={styles.input}
                                left={<TextInput.Affix text="₹" />}
                            />
                            <HelperText type="info">
                                Maximum credit amount allowed for this customer
                            </HelperText>

                            <TextInput
                                label="Notes"
                                value={formData.notes}
                                onChangeText={(text) => updateFormData('notes', text)}
                                mode="outlined"
                                multiline
                                numberOfLines={3}
                                style={styles.input}
                                placeholder="Special instructions, preferences, etc."
                            />
                        </View>

                    </Card.Content>
                </Card>

                {/* Action Buttons */}
                <View style={styles.buttonContainer}>
                    <Button
                        mode="outlined"
                        onPress={() => navigation.goBack()}
                        style={styles.button}>
                        Cancel
                    </Button>
                    <Button
                        mode="contained"
                        disabled={createProductMutation.isPending || updateProductMutation.isPending}
                        loading={createProductMutation.isPending || updateProductMutation.isPending}
                        onPress={handleSubmit}
                        style={styles.button}
                        icon="content-save">
                        {isEditMode ? 'Update' : 'Save'}
                    </Button>
                </View>

                {isEditMode && (
                    <View style={styles.deleteContainer}>
                        <Button
                            mode="text"
                            onPress={handleDelete}
                            textColor="#f44336"
                            icon="delete">
                            Delete Customer
                        </Button>
                    </View>
                )}

                <View style={styles.bottomSpace} />
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    card: {
        margin: 12,
        marginBottom: 0,
    },
    sectionTitle: {
        fontWeight: 'bold',
        color: '#333',
    },
    input: {
        marginBottom: 8,
    },
    row: {
        flexDirection: 'row',
        gap: 12,
    },
    halfWidth: {
        flex: 1,
    },
    label: {
        marginTop: 8,
        marginBottom: 8,
        color: '#666',
    },
    chipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 8,
    },
    chip: {
        marginBottom: 4,
    },
    menuScroll: {
        maxHeight: 300,
    },
    advancedHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },

    divider: {
        marginVertical: 12,
    },
    buttonContainer: {
        flexDirection: 'row',
        padding: 12,
        gap: 12,
    },
    button: {
        flex: 1,
        paddingVertical: 6,
    },
    deleteContainer: {
        alignItems: 'center',
        paddingVertical: 12,
    },
    bottomSpace: {
        height: 20,
    },
});

export default AddCustomerScreen;