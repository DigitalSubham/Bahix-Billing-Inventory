// src/screens/invoices/InvoiceListScreen.tsx
import React, { useState } from 'react';
import {
    View,
    StyleSheet,
    FlatList,
    ScrollView,
} from 'react-native';
import {
    Text,
    Searchbar,
    Card,
    Chip,
    Avatar,
    Button,
    IconButton,
    Modal,
    Portal,
    TextInput,
} from 'react-native-paper';
import DatePicker from 'react-native-date-picker';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { formTypeEnum, InvoiceType, RootStackParamList } from '../../types';
import { fetchInvoicesPage } from '../../apis/InvoiceApis';
import Loader from '../../components/common/Loader';
import { formatDate } from '../../utils/helper';
import PaginationFooter from '../../components/common/PaginationFooter';
import { usePaginatedListQuery } from '../../hooks/usePaginatedListQuery';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';

type InvoiceListScreenNavigationProp = NativeStackNavigationProp<
    RootStackParamList,
    'InvoiceList'
>;

interface Props {
    navigation: InvoiceListScreenNavigationProp;
}

type InvoiceListItem = InvoiceType & {
    paymentStatus?: InvoiceType['status'];
    total_amount?: number;
    invoice_date?: string;
    due_date?: string;
};

type GstFilter = 'all' | 'with' | 'without';
type DateFilterTarget = 'from' | 'to' | null;

const getInvoiceStatus = (invoice: InvoiceListItem): InvoiceType['status'] => {
    const baseStatus = invoice.paymentStatus ?? invoice.status;
    const isOverdue = baseStatus !== 'paid' && getDueDate(invoice) < new Date();

    return isOverdue ? 'overdue' : baseStatus;
};

const toDateOnly = (date: Date) => {
    const nextDate = new Date(date);
    nextDate.setHours(0, 0, 0, 0);
    return nextDate;
};

const toApiDate = (date: Date | null) => date?.toISOString().slice(0, 10);

const parseAmount = (value: string) => {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : undefined;
};

const sanitizeAmountInput = (value: string) =>
    value.replace(/,/g, '').replace(/[^\d.]/g, '').replace(/^(\d*\.?\d*).*$/, '$1');

const getInvoiceAmount = (invoice: InvoiceListItem) =>
    Number(invoice.totalAmount ?? invoice.total_amount ?? 0);

const getInvoiceDate = (invoice: InvoiceListItem) =>
    new Date(invoice.invoiceDate ?? invoice.invoice_date ?? '');

const getDueDate = (invoice: InvoiceListItem) =>
    new Date(invoice.dueDate ?? invoice.due_date ?? '');

const hasCustomerGstin = (invoice: InvoiceListItem) =>
    Boolean(invoice.customer?.gst_number || invoice.customer?.gstNumber);

const InvoiceListScreen: React.FC<Props> = ({ navigation }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [showFilters, setShowFilters] = useState(false);
    const [fromDate, setFromDate] = useState<Date | null>(null);
    const [toDate, setToDate] = useState<Date | null>(null);
    const [minAmount, setMinAmount] = useState('');
    const [maxAmount, setMaxAmount] = useState('');
    const [gstFilter, setGstFilter] = useState<GstFilter>('all');
    const [overdueOnly, setOverdueOnly] = useState(false);
    const [datePickerTarget, setDatePickerTarget] = useState<DateFilterTarget>(null);
    const debouncedSearchQuery = useDebouncedValue(searchQuery, 350);

    const {
        items: invoices,
        isLoading,
        refetch,
        isRefetching,
        isFetchingNextPage,
        hasNextPage,
        fetchNextPage,
    } = usePaginatedListQuery<InvoiceType>({
        queryKey: ['invoices'],
        queryFn: fetchInvoicesPage,
    });

    const trimmedSearchQuery = searchQuery.trim();
    const debouncedTrimmedSearchQuery = debouncedSearchQuery.trim();
    const hasActiveSearch = debouncedTrimmedSearchQuery.length > 0;
    const hasActiveStatusFilter = filterStatus !== 'all';
    const minAmountValue = parseAmount(minAmount);
    const maxAmountValue = parseAmount(maxAmount);
    const activeAdvancedFiltersCount = [
        fromDate,
        toDate,
        minAmountValue !== undefined,
        maxAmountValue !== undefined,
        gstFilter !== 'all',
        overdueOnly,
    ].filter(Boolean).length;
    const hasAdvancedFilters = activeAdvancedFiltersCount > 0;

    const getStatusColor = (status: string): string => {
        switch (status) {
            case 'paid':
                return '#4caf50';
            case 'pending':
                return '#ff9800';
            case 'partial':
                return '#2196F3';
            case 'overdue':
                return '#f44336';
            default:
                return '#9e9e9e';
        }
    };

    const renderInvoice = ({ item }: { item: InvoiceListItem }) => {
        const invoiceStatus = getInvoiceStatus(item);
        const isOverdue = invoiceStatus === 'overdue';
        return (
            <Card
                style={styles.invoiceCard}
                onPress={() =>
                    navigation.navigate('InvoicePreview', { invoice: item, formType: formTypeEnum.EDIT })
                }>
                <Card.Content>
                    <View style={styles.invoiceHeader}>
                        <View style={styles.invoiceLeft}>
                            <Text variant="titleSmall" style={styles.invoiceNumber}>
                                #{item.invoiceNumber}
                            </Text>
                            <Text variant="bodyMedium" style={styles.customerName}>
                                {item.customer.name}
                            </Text>
                            <Text variant="bodySmall" style={styles.invoiceDate}>
                                {`${formatDate(item.invoiceDate)} - ${formatDate(item.dueDate)}`}

                            </Text>
                        </View>
                        <View style={styles.invoiceRight}>
                            <Text variant="titleLarge" style={styles.amount}>
                                ₹{item?.totalAmount}
                            </Text>
                            <Chip
                                mode="flat"
                                compact
                                style={[
                                    styles.statusChip,
                                    { backgroundColor: getStatusColor(isOverdue ? 'overdue' : invoiceStatus) },
                                ]}
                                textStyle={styles.chipText}>
                                {isOverdue ? 'OVERDUE' : invoiceStatus?.toUpperCase() || 'N/A'}
                            </Chip>
                        </View>
                    </View>

                    <View style={styles.itemsPreview}>
                        <Text variant="bodySmall" style={styles.itemsText}>
                            {item.items.length} {item.items.length === 1 ? 'item' : 'items'}
                        </Text>
                    </View>
                </Card.Content>
            </Card >
        );
    };

    const localMatches = invoices.filter((invoice: InvoiceListItem) => {
        const invoiceStatus = getInvoiceStatus(invoice);
        const normalizedQuery = trimmedSearchQuery.toLowerCase();
        const invoiceDate = getInvoiceDate(invoice);
        const invoiceAmount = getInvoiceAmount(invoice);
        const matchesSearch =
            normalizedQuery.length === 0 ||
            String(invoice.invoiceNumber ?? '').includes(normalizedQuery) ||
            invoice.customer.name.toLowerCase().includes(normalizedQuery) ||
            invoice.customer.mobile?.includes(normalizedQuery) ||
            invoice.customer.gst_number?.toLowerCase().includes(normalizedQuery) ||
            invoice.customer.gstNumber?.toLowerCase().includes(normalizedQuery);
        const matchesStatus =
            filterStatus === 'all' || invoiceStatus === filterStatus;
        const matchesOverdue = !overdueOnly || invoiceStatus === 'overdue';
        const matchesFromDate =
            !fromDate ||
            (Number.isFinite(invoiceDate.getTime()) && toDateOnly(invoiceDate) >= toDateOnly(fromDate));
        const matchesToDate =
            !toDate ||
            (Number.isFinite(invoiceDate.getTime()) && toDateOnly(invoiceDate) <= toDateOnly(toDate));
        const matchesMinAmount =
            minAmountValue === undefined || invoiceAmount >= minAmountValue;
        const matchesMaxAmount =
            maxAmountValue === undefined || invoiceAmount <= maxAmountValue;
        const matchesGst =
            gstFilter === 'all' ||
            (gstFilter === 'with' && hasCustomerGstin(invoice)) ||
            (gstFilter === 'without' && !hasCustomerGstin(invoice));

        return (
            matchesSearch &&
            matchesStatus &&
            matchesOverdue &&
            matchesFromDate &&
            matchesToDate &&
            matchesMinAmount &&
            matchesMaxAmount &&
            matchesGst
        );
    });

    const shouldUseApiFilters =
        hasActiveStatusFilter || hasAdvancedFilters || (hasActiveSearch && localMatches.length === 0);

    const {
        items: filteredInvoicesFromApi,
        isLoading: isFilteringInvoices,
        isFetchingNextPage: isFetchingMoreFilteredInvoices,
        hasNextPage: hasMoreFilteredInvoices,
        fetchNextPage: fetchMoreFilteredInvoices,
        refetch: refetchFilteredInvoices,
        isFetched: hasFetchedFilteredInvoices,
    } = usePaginatedListQuery<InvoiceType>({
        queryKey: [
            'invoices-search',
            debouncedTrimmedSearchQuery,
            filterStatus,
            toApiDate(fromDate),
            toApiDate(toDate),
            minAmountValue,
            maxAmountValue,
            gstFilter,
            overdueOnly,
        ],
        queryFn: params =>
            fetchInvoicesPage({
                ...params,
                search: hasActiveSearch ? debouncedTrimmedSearchQuery : undefined,
                status: filterStatus === 'all' ? undefined : filterStatus,
                fromDate: toApiDate(fromDate),
                toDate: toApiDate(toDate),
                minAmount: minAmountValue,
                maxAmount: maxAmountValue,
                hasGstin:
                    gstFilter === 'all'
                        ? undefined
                        : gstFilter === 'with',
                overdue: overdueOnly || filterStatus === 'overdue' ? true : undefined,
            }),
        staleTime: 30 * 1000,
        enabled: shouldUseApiFilters,
    });

    const filteredInvoices = shouldUseApiFilters && hasFetchedFilteredInvoices
        ? filteredInvoicesFromApi.filter((invoice: InvoiceListItem) => {
            const invoiceStatus = getInvoiceStatus(invoice);
            const invoiceDate = getInvoiceDate(invoice);
            const invoiceAmount = getInvoiceAmount(invoice);
            const matchesStatus = filterStatus === 'all' || invoiceStatus === filterStatus;
            const matchesOverdue = !overdueOnly || invoiceStatus === 'overdue';
            const matchesFromDate =
                !fromDate ||
                (Number.isFinite(invoiceDate.getTime()) && toDateOnly(invoiceDate) >= toDateOnly(fromDate));
            const matchesToDate =
                !toDate ||
                (Number.isFinite(invoiceDate.getTime()) && toDateOnly(invoiceDate) <= toDateOnly(toDate));
            const matchesMinAmount =
                minAmountValue === undefined || invoiceAmount >= minAmountValue;
            const matchesMaxAmount =
                maxAmountValue === undefined || invoiceAmount <= maxAmountValue;
            const matchesGst =
                gstFilter === 'all' ||
                (gstFilter === 'with' && hasCustomerGstin(invoice)) ||
                (gstFilter === 'without' && !hasCustomerGstin(invoice));

            return (
                matchesStatus &&
                matchesOverdue &&
                matchesFromDate &&
                matchesToDate &&
                matchesMinAmount &&
                matchesMaxAmount &&
                matchesGst
            );
        })
        : localMatches;

    if (isLoading) {
        return (
            <Loader text="Loading invoices..." />
        );
    }

    const handleRefresh = () => {
        if (shouldUseApiFilters) {
            refetchFilteredInvoices();
            return;
        }

        refetch();
    };

    const handleEndReached = () => {
        if (trimmedSearchQuery.length > 0 || hasActiveStatusFilter || hasAdvancedFilters) {
            if (shouldUseApiFilters && hasMoreFilteredInvoices && !isFetchingMoreFilteredInvoices) {
                fetchMoreFilteredInvoices();
            }
            return;
        }

        if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    };

    const clearAdvancedFilters = () => {
        setFromDate(null);
        setToDate(null);
        setMinAmount('');
        setMaxAmount('');
        setGstFilter('all');
        setOverdueOnly(false);
    };

    const clearAllFilters = () => {
        setSearchQuery('');
        setFilterStatus('all');
        clearAdvancedFilters();
    };

    const openDatePicker = (target: DateFilterTarget) => {
        setDatePickerTarget(target);
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.searchRow}>
                    <Searchbar
                        placeholder="Search customer, mobile, GSTIN..."
                        onChangeText={setSearchQuery}
                        value={searchQuery}
                        style={styles.searchbar}
                    />
                    <IconButton
                        icon={hasAdvancedFilters ? 'filter-check' : 'filter-variant'}
                        mode={hasAdvancedFilters ? 'contained' : 'outlined'}
                        size={22}
                        onPress={() => setShowFilters(true)}
                        style={styles.filterButton}
                    />
                </View>

                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filterTabs}
                >
                    {[
                        { value: 'all', label: 'All' },
                        { value: 'pending', label: 'Pending' },
                        { value: 'partial', label: 'Partial' },
                        { value: 'paid', label: 'Paid' },
                        { value: 'overdue', label: 'Overdue' },
                    ].map(tab => (
                        <Chip
                            key={tab.value}
                            selected={filterStatus === tab.value}
                            onPress={() => setFilterStatus(tab.value)}
                            mode={filterStatus === tab.value ? 'flat' : 'outlined'}
                            style={styles.filterChip}
                            textStyle={styles.filterChipText}
                        >
                            {tab.label}
                        </Chip>
                    ))}
                </ScrollView>

                {(hasAdvancedFilters || hasActiveSearch || hasActiveStatusFilter) && (
                    <View style={styles.activeSummaryRow}>
                        <Text style={styles.activeSummaryText}>
                            {filteredInvoices.length} result{filteredInvoices.length === 1 ? '' : 's'}
                            {activeAdvancedFiltersCount > 0 ? ` • ${activeAdvancedFiltersCount} filter${activeAdvancedFiltersCount === 1 ? '' : 's'}` : ''}
                        </Text>
                        <Button
                            mode="text"
                            compact
                            onPress={clearAllFilters}
                            textColor="#4a2090"
                        >
                            Clear
                        </Button>
                    </View>
                )}
            </View>

            <FlatList
                data={filteredInvoices}
                onRefresh={handleRefresh}
                refreshing={
                    shouldUseApiFilters
                        ? isFilteringInvoices && !isFetchingMoreFilteredInvoices
                        : isRefetching && !isFetchingNextPage
                }
                renderItem={renderInvoice}
                keyExtractor={(item, index) => item.id ?? `invoice-${item.invoiceNumber ?? index}`}
                contentContainerStyle={styles.list}
                onEndReached={handleEndReached}
                onEndReachedThreshold={0.4}
                ListFooterComponent={
                    <PaginationFooter
                        isLoading={
                            trimmedSearchQuery.length > 0 || hasActiveStatusFilter || hasAdvancedFilters
                                ? shouldUseApiFilters && (isFetchingMoreFilteredInvoices || isFilteringInvoices)
                                : isFetchingNextPage
                        }
                        hasNextPage={
                            trimmedSearchQuery.length > 0 || hasActiveStatusFilter || hasAdvancedFilters
                                ? shouldUseApiFilters && Boolean(hasMoreFilteredInvoices)
                                : Boolean(hasNextPage)
                        }
                    />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Avatar.Icon
                            size={80}
                            icon="file-document"
                            style={styles.emptyIcon}
                        />
                        <Text variant="titleMedium" style={styles.emptyTitle}>
                            No Invoices Found
                        </Text>
                        <Text variant="bodyMedium" style={styles.emptyText}>
                            Create your first invoice to get started
                        </Text>
                    </View>
                }
            />

            <Portal>
                <Modal
                    visible={showFilters}
                    onDismiss={() => setShowFilters(false)}
                    contentContainerStyle={styles.filterModalContainer}
                >
                    <View style={styles.filterModal}>
                        <View style={styles.filterModalHeader}>
                            <View>
                                <Text variant="titleMedium" style={styles.filterTitle}>
                                    Filters
                                </Text>
                                <Text style={styles.filterSubtitle}>
                                    Date, amount, GST and overdue
                                </Text>
                            </View>
                            <IconButton icon="close" onPress={() => setShowFilters(false)} />
                        </View>

                        <Text style={styles.filterSectionLabel}>Invoice date</Text>
                        <View style={styles.dateRow}>
                            <Button
                                mode="outlined"
                                icon="calendar-start"
                                onPress={() => openDatePicker('from')}
                                style={styles.dateButton}
                                textColor="#334155"
                            >
                                {fromDate ? formatDate(fromDate) : 'From'}
                            </Button>
                            <Button
                                mode="outlined"
                                icon="calendar-end"
                                onPress={() => openDatePicker('to')}
                                style={styles.dateButton}
                                textColor="#334155"
                            >
                                {toDate ? formatDate(toDate) : 'To'}
                            </Button>
                        </View>

                        <Text style={styles.filterSectionLabel}>Amount</Text>
                        <View style={styles.amountRow}>
                            <TextInput
                                label="Min"
                                value={minAmount}
                                onChangeText={text => setMinAmount(sanitizeAmountInput(text))}
                                keyboardType="decimal-pad"
                                mode="outlined"
                                dense
                                style={styles.amountInput}
                                left={<TextInput.Affix text="₹" />}
                            />
                            <TextInput
                                label="Max"
                                value={maxAmount}
                                onChangeText={text => setMaxAmount(sanitizeAmountInput(text))}
                                keyboardType="decimal-pad"
                                mode="outlined"
                                dense
                                style={styles.amountInput}
                                left={<TextInput.Affix text="₹" />}
                            />
                        </View>

                        <Text style={styles.filterSectionLabel}>GST</Text>
                        <View style={styles.compactChipRow}>
                            {[
                                { value: 'all', label: 'All' },
                                { value: 'with', label: 'GSTIN' },
                                { value: 'without', label: 'No GSTIN' },
                            ].map(option => (
                                <Chip
                                    key={option.value}
                                    selected={gstFilter === option.value}
                                    onPress={() => setGstFilter(option.value as GstFilter)}
                                    mode={gstFilter === option.value ? 'flat' : 'outlined'}
                                    style={styles.modalChip}
                                >
                                    {option.label}
                                </Chip>
                            ))}
                        </View>

                        <View style={styles.overdueRow}>
                            <View>
                                <Text style={styles.overdueTitle}>Overdue only</Text>
                                <Text style={styles.overdueSubtitle}>Due date passed and not paid</Text>
                            </View>
                            <Chip
                                selected={overdueOnly}
                                onPress={() => setOverdueOnly(prev => !prev)}
                                mode={overdueOnly ? 'flat' : 'outlined'}
                                style={styles.overdueChip}
                            >
                                {overdueOnly ? 'On' : 'Off'}
                            </Chip>
                        </View>

                        <View style={styles.filterActions}>
                            <Button
                                mode="outlined"
                                onPress={clearAdvancedFilters}
                                style={styles.filterActionButton}
                                textColor="#4a2090"
                            >
                                Reset
                            </Button>
                            <Button
                                mode="contained"
                                onPress={() => setShowFilters(false)}
                                style={styles.filterActionButton}
                                buttonColor="#4a2090"
                            >
                                Apply
                            </Button>
                        </View>
                    </View>
                </Modal>
            </Portal>

            <DatePicker
                modal
                mode="date"
                open={datePickerTarget !== null}
                date={
                    datePickerTarget === 'to'
                        ? toDate ?? fromDate ?? new Date()
                        : fromDate ?? new Date()
                }
                minimumDate={datePickerTarget === 'to' ? fromDate ?? undefined : undefined}
                onConfirm={date => {
                    if (datePickerTarget === 'from') {
                        setFromDate(date);
                        if (toDate && toDateOnly(toDate) < toDateOnly(date)) {
                            setToDate(date);
                        }
                    }

                    if (datePickerTarget === 'to') {
                        setToDate(date);
                    }

                    setDatePickerTarget(null);
                }}
                onCancel={() => setDatePickerTarget(null)}
            />
        </View>
    );
};




const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        padding: 12,
        backgroundColor: '#fff',
        elevation: 2,
    },
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    searchbar: {
        flex: 1,
        backgroundColor: '#F6F7FB',
    },
    filterButton: {
        margin: 0,
        borderColor: '#D8D2E7',
    },
    filterTabs: {
        gap: 8,
        paddingRight: 8,
    },
    filterChip: {
        height: 36,
        justifyContent: 'center',
    },
    filterChipText: {
        fontSize: 13,
    },
    activeSummaryRow: {
        marginTop: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    activeSummaryText: {
        color: '#6B6478',
        fontSize: 12,
        fontWeight: '600',
    },
    list: {
        padding: 12,
    },
    invoiceCard: {
        marginBottom: 12,
    },
    invoiceHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    invoiceLeft: {
        flex: 1,
    },
    invoiceNumber: {
        fontWeight: 'bold',
        color: '#2196F3',
    },
    customerName: {
        marginTop: 4,
    },
    invoiceDate: {
        color: '#666',
        marginTop: 4,
    },
    invoiceRight: {
        alignItems: 'flex-end',
    },
    amount: {
        fontWeight: 'bold',
    },
    statusChip: {
        marginTop: 8,
        height: 28,
        paddingVertical: 0,      // 🔑 remove extra vertical padding
        justifyContent: "center",
    },

    chipText: {
        fontSize: 11,
        color: "#fff",
        lineHeight: 14,          // 🔑 critical
        paddingVertical: 0,
    },

    balanceContainer: {
        backgroundColor: '#fff3e0',
        padding: 8,
        borderRadius: 8,
        marginBottom: 8,
    },
    balanceInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    balanceLabel: {
        color: '#666',
    },
    balanceAmount: {
        fontWeight: '600',
        color: '#ff9800',
    },
    dueDate: {
        color: '#666',
    },
    itemsPreview: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    itemsText: {
        color: '#666',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 100,
    },
    emptyIcon: {
        backgroundColor: '#e3f2fd',
    },
    emptyTitle: {
        marginTop: 16,
        fontWeight: 'bold',
    },
    emptyText: {
        marginTop: 8,
        color: '#666',
        textAlign: 'center',
    },
    filterModalContainer: {
        marginHorizontal: 16,
    },
    filterModal: {
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        padding: 16,
    },
    filterModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    filterTitle: {
        fontWeight: '800',
        color: '#24153D',
    },
    filterSubtitle: {
        color: '#756E86',
        fontSize: 12,
        marginTop: 2,
    },
    filterSectionLabel: {
        color: '#4E465F',
        fontSize: 12,
        fontWeight: '700',
        marginTop: 10,
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    dateRow: {
        flexDirection: 'row',
        gap: 10,
    },
    dateButton: {
        flex: 1,
        borderColor: '#D8D2E7',
        borderRadius: 10,
    },
    amountRow: {
        flexDirection: 'row',
        gap: 10,
    },
    amountInput: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    compactChipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    modalChip: {
        borderColor: '#D8D2E7',
    },
    overdueRow: {
        marginTop: 14,
        padding: 12,
        borderRadius: 12,
        backgroundColor: '#FFF7ED',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
    },
    overdueTitle: {
        color: '#2F243A',
        fontWeight: '700',
    },
    overdueSubtitle: {
        color: '#8A6A42',
        fontSize: 12,
        marginTop: 2,
    },
    overdueChip: {
        minWidth: 64,
    },
    filterActions: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 18,
    },
    filterActionButton: {
        flex: 1,
        borderRadius: 10,
    },
});

export default InvoiceListScreen;
