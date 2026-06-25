// src/screens/products/ProductListScreen.tsx
import React, { useState } from "react";
import {
    View,
    StyleSheet,
    FlatList,
    ScrollView,
} from "react-native";
import {
    Text,
    Searchbar,
    IconButton,
    Menu,
    Avatar,
    Button,
    Chip,
    Modal,
    Portal,
    TextInput,
} from "react-native-paper";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList, ProductType } from "../../types";
import { fetchProductsPage } from "../../apis/productApis";
import ProductCard from "../../components/products/ProductCard";
import Loader from "../../components/common/Loader";
import PaginationFooter from "../../components/common/PaginationFooter";
import { usePaginatedListQuery } from "../../hooks/usePaginatedListQuery";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { CATEGORY_OPTIONS, TAX_RATES } from "../../constants/state";


export type ProductListScreenNavigationProp = NativeStackNavigationProp<
    RootStackParamList,
    "ProductList"
>;

interface Props {
    navigation: ProductListScreenNavigationProp;
}

type StockStatusFilter = "all" | "in_stock" | "low_stock" | "out_of_stock";

const parseAmount = (value: string) => {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : undefined;
};

const sanitizeAmountInput = (value: string) =>
    value.replace(/,/g, "").replace(/[^\d.]/g, "").replace(/^(\d*\.?\d*).*$/, "$1");

const getProductStockStatus = (product: ProductType): Exclude<StockStatusFilter, "all"> => {
    const stock = Number.parseFloat(String(product.stock ?? 0)) || 0;
    const minStock = Number(product.minStock ?? 0);

    if (stock <= 0) {
        return "out_of_stock";
    }

    if (minStock > 0 && stock <= minStock) {
        return "low_stock";
    }

    return "in_stock";
};

const ProductListScreen: React.FC<Props> = () => {
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState<"name" | "stock" | "price">("name");
    const [menuVisible, setMenuVisible] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [stockStatus, setStockStatus] = useState<StockStatusFilter>("all");
    const [category, setCategory] = useState("all");
    const [gstRate, setGstRate] = useState("all");
    const [minPrice, setMinPrice] = useState("");
    const [maxPrice, setMaxPrice] = useState("");
    const debouncedSearchQuery = useDebouncedValue(searchQuery, 350);
    const apiSortBy = sortBy === "price" ? "selling_rate" : sortBy;
    const apiSortOrder = sortBy === "price" ? "desc" : "asc";
    const minPriceValue = parseAmount(minPrice);
    const maxPriceValue = parseAmount(maxPrice);
    const activeFilterCount = [
        stockStatus !== "all",
        category !== "all",
        gstRate !== "all",
        minPriceValue !== undefined,
        maxPriceValue !== undefined,
    ].filter(Boolean).length;
    const hasAdvancedFilters = activeFilterCount > 0;

    const {
        items: products,
        isLoading,
        refetch,
        isRefetching,
        isFetchingNextPage,
        hasNextPage,
        fetchNextPage,
    } = usePaginatedListQuery<ProductType>({
        queryKey: [
            "products",
            sortBy,
            stockStatus,
            category,
            gstRate,
            minPriceValue,
            maxPriceValue,
        ],
        queryFn: params =>
            fetchProductsPage({
                ...params,
                sortBy: apiSortBy,
                sortOrder: apiSortOrder,
                stockStatus: stockStatus === "all" ? undefined : stockStatus,
                category: category === "all" ? undefined : category,
                gstRate: gstRate === "all" ? undefined : Number(gstRate),
                minPrice: minPriceValue,
                maxPrice: maxPriceValue,
            }),
        staleTime: 5 * 60 * 1000,
    });

    const trimmedSearchQuery = searchQuery.trim();
    const debouncedTrimmedSearchQuery = debouncedSearchQuery.trim();

    const localMatches = products.filter(
        (product: ProductType) => {
            const normalizedQuery = trimmedSearchQuery.toLowerCase();
            const price = Number.parseFloat(String(product.rate ?? 0)) || 0;
            const matchesSearch =
                normalizedQuery.length === 0 ||
                product.name.toLowerCase().includes(normalizedQuery) ||
                product.description?.toLowerCase().includes(normalizedQuery) ||
                product.barcode?.toLowerCase().includes(normalizedQuery) ||
                product.hsnCode?.toLowerCase().includes(normalizedQuery);
            const matchesStock =
                stockStatus === "all" || getProductStockStatus(product) === stockStatus;
            const matchesCategory =
                category === "all" || product.category === category;
            const matchesGst =
                gstRate === "all" || Number(product.taxRate) === Number(gstRate);
            const matchesMinPrice =
                minPriceValue === undefined || price >= minPriceValue;
            const matchesMaxPrice =
                maxPriceValue === undefined || price <= maxPriceValue;

            return (
                matchesSearch &&
                matchesStock &&
                matchesCategory &&
                matchesGst &&
                matchesMinPrice &&
                matchesMaxPrice
            );
        }
    );

    const shouldUseApiSearch =
        debouncedTrimmedSearchQuery.length > 0 && localMatches.length === 0;

    const {
        items: searchedProducts,
        isLoading: isSearchingProducts,
        isFetchingNextPage: isFetchingMoreSearchedProducts,
        hasNextPage: hasMoreSearchedProducts,
        fetchNextPage: fetchMoreSearchedProducts,
    } = usePaginatedListQuery<ProductType>({
        queryKey: [
            "products-search",
            debouncedTrimmedSearchQuery,
            sortBy,
            stockStatus,
            category,
            gstRate,
            minPriceValue,
            maxPriceValue,
        ],
        queryFn: params =>
            fetchProductsPage({
                ...params,
                search: debouncedTrimmedSearchQuery,
                sortBy: apiSortBy,
                sortOrder: apiSortOrder,
                stockStatus: stockStatus === "all" ? undefined : stockStatus,
                category: category === "all" ? undefined : category,
                gstRate: gstRate === "all" ? undefined : Number(gstRate),
                minPrice: minPriceValue,
                maxPrice: maxPriceValue,
            }),
        staleTime: 30 * 1000,
        enabled: shouldUseApiSearch,
    });

    if (isLoading) {
        return (
            <Loader />
        );
    }



    // 🔍 Search + Sorting Logic
    const filteredProducts = [...(shouldUseApiSearch ? searchedProducts : localMatches)]
        .filter((product: ProductType) => {
            const normalizedQuery = trimmedSearchQuery.toLowerCase();
            const price = Number.parseFloat(String(product.rate ?? 0)) || 0;
            const matchesSearch =
                normalizedQuery.length === 0 ||
                product.name.toLowerCase().includes(normalizedQuery) ||
                product.description?.toLowerCase().includes(normalizedQuery) ||
                product.barcode?.toLowerCase().includes(normalizedQuery) ||
                product.hsnCode?.toLowerCase().includes(normalizedQuery);
            const matchesStock =
                stockStatus === "all" || getProductStockStatus(product) === stockStatus;
            const matchesCategory =
                category === "all" || product.category === category;
            const matchesGst =
                gstRate === "all" || Number(product.taxRate) === Number(gstRate);
            const matchesMinPrice =
                minPriceValue === undefined || price >= minPriceValue;
            const matchesMaxPrice =
                maxPriceValue === undefined || price <= maxPriceValue;

            return (
                matchesSearch &&
                matchesStock &&
                matchesCategory &&
                matchesGst &&
                matchesMinPrice &&
                matchesMaxPrice
            );
        })
        .sort((a: ProductType, b: ProductType) => {
            const stockA = Number.parseFloat(String(a.stock ?? 0)) || 0;
            const stockB = Number.parseFloat(String(b.stock ?? 0)) || 0;
            const priceA = Number.parseFloat(String(a.rate ?? 0)) || 0;
            const priceB = Number.parseFloat(String(b.rate ?? 0)) || 0;

            switch (sortBy) {
                case "name":
                    return a.name.localeCompare(b.name);
                case "stock":
                    return stockA - stockB;
                case "price":
                    return priceB - priceA;
                default:
                    return 0;
            }
        });

    const handleEndReached = () => {
        if (trimmedSearchQuery.length > 0) {
            if (shouldUseApiSearch && hasMoreSearchedProducts && !isFetchingMoreSearchedProducts) {
                fetchMoreSearchedProducts();
            }
            return;
        }

        if (shouldUseApiSearch) {
            if (hasMoreSearchedProducts && !isFetchingMoreSearchedProducts) {
                fetchMoreSearchedProducts();
            }
            return;
        }

        if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    };

    const clearAdvancedFilters = () => {
        setStockStatus("all");
        setCategory("all");
        setGstRate("all");
        setMinPrice("");
        setMaxPrice("");
    };

    const clearAllFilters = () => {
        setSearchQuery("");
        clearAdvancedFilters();
    };


    return (
        <View style={styles.container}>
            {/* Header Search + Sorting */}
            <View style={styles.header}>
                <View style={styles.searchRow}>
                    <Searchbar
                        placeholder="Search name, SKU, HSN..."
                        onChangeText={setSearchQuery}
                        value={searchQuery}
                        style={styles.searchbar}
                    />

                    <IconButton
                        icon={hasAdvancedFilters ? "filter-check" : "filter-variant"}
                        mode={hasAdvancedFilters ? "contained" : "outlined"}
                        size={22}
                        onPress={() => setShowFilters(true)}
                        style={styles.iconButton}
                    />

                    <Menu
                        visible={menuVisible}
                        onDismiss={() => setMenuVisible(false)}
                        anchor={
                            <IconButton
                                icon="sort"
                                mode="outlined"
                                size={22}
                                onPress={() => setMenuVisible(true)}
                                style={styles.iconButton}
                            />
                        }
                    >
                        <Menu.Item
                            onPress={() => {
                                setSortBy("name");
                                setMenuVisible(false);
                            }}
                            title="Name"
                            leadingIcon={sortBy === "name" ? "check" : undefined}
                        />
                        <Menu.Item
                            onPress={() => {
                                setSortBy("stock");
                                setMenuVisible(false);
                            }}
                            title="Stock"
                            leadingIcon={sortBy === "stock" ? "check" : undefined}
                        />
                        <Menu.Item
                            onPress={() => {
                                setSortBy("price");
                                setMenuVisible(false);
                            }}
                            title="Selling rate"
                            leadingIcon={sortBy === "price" ? "check" : undefined}
                        />
                    </Menu>
                </View>

                {(hasAdvancedFilters || trimmedSearchQuery.length > 0) && (
                    <View style={styles.activeSummaryRow}>
                        <Text style={styles.activeSummaryText}>
                            {filteredProducts.length} result{filteredProducts.length === 1 ? "" : "s"}
                            {activeFilterCount > 0 ? ` • ${activeFilterCount} filter${activeFilterCount === 1 ? "" : "s"}` : ""}
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

            {/* Product List */}
            <FlatList
                data={filteredProducts}
                renderItem={({ item }) => <ProductCard item={item} />}
                keyExtractor={(item) => item.id}
                contentContainerStyle={[styles.list, { flexGrow: 1 }]}
                onRefresh={refetch}
                refreshing={isRefetching && !isFetchingNextPage && !isFetchingMoreSearchedProducts}
                onEndReached={handleEndReached}
                onEndReachedThreshold={0.4}
                ListFooterComponent={
                    <PaginationFooter
                        isLoading={
                            trimmedSearchQuery.length > 0
                                ? shouldUseApiSearch && (isFetchingMoreSearchedProducts || isSearchingProducts)
                                : isFetchingNextPage
                        }
                        hasNextPage={
                            trimmedSearchQuery.length > 0
                                ? shouldUseApiSearch && Boolean(hasMoreSearchedProducts)
                                : Boolean(hasNextPage)
                        }
                    />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Avatar.Icon
                            size={80}
                            icon="package-variant"
                            style={styles.emptyIcon}
                        />
                        <Text variant="titleMedium" style={styles.emptyTitle}>
                            No Products Found
                        </Text>
                        <Text variant="bodyMedium" style={styles.emptyText}>
                            Add your first product to get started
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
                                    Stock, category, GST and price
                                </Text>
                            </View>
                            <IconButton icon="close" onPress={() => setShowFilters(false)} />
                        </View>

                        <Text style={styles.filterSectionLabel}>Stock</Text>
                        <View style={styles.compactChipRow}>
                            {[
                                { value: "all", label: "All" },
                                { value: "in_stock", label: "In stock" },
                                { value: "low_stock", label: "Low" },
                                { value: "out_of_stock", label: "Out" },
                            ].map(option => (
                                <Chip
                                    key={option.value}
                                    selected={stockStatus === option.value}
                                    onPress={() => setStockStatus(option.value as StockStatusFilter)}
                                    mode={stockStatus === option.value ? "flat" : "outlined"}
                                    style={styles.modalChip}
                                >
                                    {option.label}
                                </Chip>
                            ))}
                        </View>

                        <Text style={styles.filterSectionLabel}>Category</Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.horizontalChipRow}
                        >
                            {[{ label: "All", value: "all" }, ...CATEGORY_OPTIONS].map(option => (
                                <Chip
                                    key={option.value}
                                    selected={category === option.value}
                                    onPress={() => setCategory(String(option.value))}
                                    mode={category === option.value ? "flat" : "outlined"}
                                    style={styles.modalChip}
                                >
                                    {option.label}
                                </Chip>
                            ))}
                        </ScrollView>

                        <Text style={styles.filterSectionLabel}>GST</Text>
                        <View style={styles.compactChipRow}>
                            {[{ label: "All", value: "all" }, ...TAX_RATES.map(rate => ({ label: `${Number(rate)}%`, value: rate }))].map(option => (
                                <Chip
                                    key={option.value}
                                    selected={gstRate === option.value}
                                    onPress={() => setGstRate(String(option.value))}
                                    mode={gstRate === option.value ? "flat" : "outlined"}
                                    style={styles.modalChip}
                                >
                                    {option.label}
                                </Chip>
                            ))}
                        </View>

                        <Text style={styles.filterSectionLabel}>Selling rate</Text>
                        <View style={styles.amountRow}>
                            <TextInput
                                label="Min"
                                value={minPrice}
                                onChangeText={text => setMinPrice(sanitizeAmountInput(text))}
                                keyboardType="decimal-pad"
                                mode="outlined"
                                dense
                                style={styles.amountInput}
                                left={<TextInput.Affix text="₹" />}
                            />
                            <TextInput
                                label="Max"
                                value={maxPrice}
                                onChangeText={text => setMaxPrice(sanitizeAmountInput(text))}
                                keyboardType="decimal-pad"
                                mode="outlined"
                                dense
                                style={styles.amountInput}
                                left={<TextInput.Affix text="₹" />}
                            />
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
    },
    searchbar: {
        flex: 1,
        backgroundColor: '#F6F7FB',
    },
    iconButton: {
        margin: 0,
        borderColor: '#D8D2E7',
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
    compactChipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    horizontalChipRow: {
        gap: 8,
        paddingRight: 8,
    },
    modalChip: {
        borderColor: '#D8D2E7',
    },
    amountRow: {
        flexDirection: 'row',
        gap: 10,
    },
    amountInput: {
        flex: 1,
        backgroundColor: '#FFFFFF',
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

export default ProductListScreen;
