import { StyleSheet, View } from 'react-native'
import React from 'react'
import { Card, Chip, IconButton, Text } from 'react-native-paper'
import { formTypeEnum, ProductType } from '../../types'
import { useNavigation } from '@react-navigation/native'
import { ProductListScreenNavigationProp } from '../../screens/Inventory/ProductListScreen'
import { formatProductStock } from '../../utils/helper'

const ProductCard = ({ item }: { item: ProductType }) => {
    const isLowStock = item.minStock && Number.parseFloat(item.stock) <= item.minStock
    const navigation = useNavigation<ProductListScreenNavigationProp>()

    const displayStock = formatProductStock(item);

    return (
        <Card
            style={styles.card}
            onPress={() => navigation.navigate("ProductForm", { productId: item.id, formType: formTypeEnum.EDIT })}
        >
            <Card.Content style={styles.content}>
                <View style={styles.topRow}>
                    <View style={styles.info}>
                        <Text variant="titleSmall" style={styles.name} numberOfLines={1}>
                            {item.name}
                        </Text>
                        {item.description && (
                            <Text variant="bodySmall" style={styles.description} numberOfLines={1}>
                                desc: {item.description}
                            </Text>
                        )}
                    </View>
                    <IconButton
                        icon="pencil"
                        size={20}
                        onPress={() =>
                            navigation.navigate("ProductForm", { productId: item.id, formType: formTypeEnum.EDIT })
                        }
                        style={styles.editIcon}
                    />
                </View>

                <View style={styles.detailsRow}>
                    <Text variant="bodySmall">MRP: ₹{item.mrp}</Text>
                    <Text variant="bodySmall">Rate: ₹{item.rate}</Text>
                    <Text variant="bodySmall">Tax: {item.taxRate}%</Text>
                </View>

                <View style={styles.stockRow}>
                    <Chip
                        compact
                        icon={isLowStock ? "alert" : "package-variant"}
                        style={[styles.stockChip, isLowStock ? styles.lowStockChip : null]}
                        textStyle={[styles.stockText, isLowStock ? styles.lowStockText : null]}
                    >
                        {displayStock}
                    </Chip>

                    {isLowStock && (
                        <Chip style={styles.alertChip} textStyle={styles.alertText} compact>
                            LOW
                        </Chip>
                    )}
                </View>
            </Card.Content>
        </Card>
    )
}

export default ProductCard

const styles = StyleSheet.create({
    card: {
        marginBottom: 8,
        borderRadius: 8,
    },
    content: {
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    info: {
        flex: 1,
        marginRight: 8,
    },
    name: {
        fontWeight: 'bold',
    },
    description: {
        color: '#666',
        fontSize: 12,
        marginTop: 2,
    },
    editIcon: {
        margin: 0,
    },
    detailsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    stockRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    stockChip: {
        backgroundColor: '#e3f2fd',
        height: 28,
        paddingHorizontal: 0,
        paddingVertical: 0,
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'flex-start',
    },
    stockText: {
        fontSize: 12,
        lineHeight: 14,
    },
    lowStockChip: {
        backgroundColor: '#ffebee',
    },
    lowStockText: {
        color: '#f44336',
    },
    alertChip: {
        backgroundColor: '#f44336',
        height: 28,
        paddingHorizontal: 0,
        justifyContent: 'center',
        alignSelf: 'flex-start',
        alignItems: 'center',
    },

    alertText: {
        fontSize: 10,
        lineHeight: 12,
        color: '#fff',
    },


})
