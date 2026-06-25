import type React from "react"
import { View, StyleSheet, ScrollView, RefreshControl } from "react-native"
import { Card, Text, Avatar } from "react-native-paper"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"
import type { RootStackParamList, DashboardStats } from "../../types"
import { useQuery } from "@tanstack/react-query"
import { getProfileApi } from "../../apis/authApi"
import { dashboardStats } from "../../apis/dashboardApi"

type DashboardScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, "Dashboard">

interface Props {
    navigation: DashboardScreenNavigationProp
}

type ApiDashboardStats = {
    totalRevenue?: number | null
    revenueToday?: number | null
    revenueLast7Days?: number | null
    revenueLast30Days?: number | null
    totalInvoices?: number | null
    invoicesToday?: number | null
    totalProducts?: number | null
    totalCustomers?: number | null
}

const emptyStats: DashboardStats = {
    totalSales: 0,
    totalInvoices: 0,
    pendingAmount: 0,
    lowStockItems: 0,
    todaySales: 0,
    monthSales: 0,
}

const numberOrZero = (value?: number | null) =>
    typeof value === "number" && Number.isFinite(value) ? value : 0

const DashboardScreen: React.FC<Props> = ({ navigation }) => {
    const { data: business } = useQuery({
        queryKey: ['business'],
        queryFn: getProfileApi,
    })
    const { data: dashboardData, isFetching, refetch } = useQuery({
        queryKey: ['dashboardStats'],
        queryFn: dashboardStats,
    })

    const stats = emptyStats
    const safeDashboardData: Record<keyof ApiDashboardStats, number> = {
        totalRevenue: numberOrZero(dashboardData?.totalRevenue),
        revenueToday: numberOrZero(dashboardData?.revenueToday),
        revenueLast7Days: numberOrZero(dashboardData?.revenueLast7Days),
        revenueLast30Days: numberOrZero(dashboardData?.revenueLast30Days),
        totalInvoices: numberOrZero(dashboardData?.totalInvoices),
        invoicesToday: numberOrZero(dashboardData?.invoicesToday),
        totalProducts: numberOrZero(dashboardData?.totalProducts),
        totalCustomers: numberOrZero(dashboardData?.totalCustomers),
    }

    return (
        <View style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} />}>
                <Card style={styles.overviewCard}>
                    <Card.Content style={styles.overviewContent}>
                        <View style={styles.overviewHeader}>
                            <View style={styles.overviewTextBlock}>
                                <Text style={styles.overviewKicker}>Business overview</Text>
                                <Text style={styles.overviewTitle}>
                                    {business?.name || "Bahix Workspace"}
                                </Text>
                                <Text style={styles.overviewSubtitle}>
                                    {new Date().toLocaleDateString("en-IN", {
                                        weekday: "long",
                                        month: "short",
                                        day: "numeric",
                                    })}
                                </Text>
                            </View>
                            <Avatar.Icon
                                size={48}
                                icon="view-dashboard-outline"
                                style={styles.overviewAvatar}
                            />
                        </View>

                        <View style={styles.overviewHighlights}>
                            <View style={styles.overviewChip}>
                                <Text style={styles.overviewChipLabel}>Today revenue</Text>
                                <Text style={styles.overviewChipValue}>
                                    ₹{(safeDashboardData.revenueToday / 1000).toFixed(1)}K
                                </Text>
                            </View>
                            <View style={styles.overviewChip}>
                                <Text style={styles.overviewChipLabel}>Customers</Text>
                                <Text style={styles.overviewChipValue}>
                                    {safeDashboardData.totalCustomers}
                                </Text>
                            </View>
                        </View>
                    </Card.Content>
                </Card>

                <View style={styles.primaryStatsContainer}>
                    <Card style={[styles.primaryStatCard, { backgroundColor: "#1E7BE6" }]}>
                        <Card.Content style={styles.primaryStatContent}>
                            <View style={styles.primaryStatHeader}>
                                <Text style={styles.primaryStatLabel}>Total Sales</Text>
                                <Avatar.Icon size={40} icon="currency-inr" style={styles.primaryIconOverlay} />
                            </View>
                            <Text style={styles.primaryStatValue}>₹{(safeDashboardData.totalRevenue / 100000).toFixed(1)}L</Text>
                            <Text style={styles.primaryStatSubtext}>All time revenue</Text>
                        </Card.Content>
                    </Card>

                    <Card style={[styles.primaryStatCard, { backgroundColor: "#8B5CF6" }]}>
                        <Card.Content style={styles.primaryStatContent}>
                            <View style={styles.primaryStatHeader}>
                                <Text style={styles.primaryStatLabel}>Invoices</Text>
                                <Avatar.Icon size={40} icon="file-document" style={styles.primaryIconOverlay} />
                            </View>
                            <Text style={styles.primaryStatValue}>{safeDashboardData.totalInvoices}</Text>
                            <Text style={styles.primaryStatSubtext}>Total created</Text>
                        </Card.Content>
                    </Card>
                </View>

                <View style={styles.secondaryStatsRow}>
                    <Card style={styles.secondaryCard}>
                        <Card.Content style={styles.secondaryContent}>
                            <View style={styles.secondaryIcon}>
                                <Text style={{ fontSize: 20 }}>⏳</Text>
                            </View>
                            <Text style={styles.secondaryLabel}>Pending</Text>
                            <Text style={styles.secondaryValue}>₹{(stats.pendingAmount / 1000)?.toFixed(0)}K</Text>
                        </Card.Content>
                    </Card>

                    <Card style={styles.secondaryCard}>
                        <Card.Content style={styles.secondaryContent}>
                            <View style={styles.secondaryIcon}>
                                <Text style={{ fontSize: 20 }}>📦</Text>
                            </View>
                            <Text style={styles.secondaryLabel}>Low Stock</Text>
                            <Text style={styles.secondaryValue}>{stats.lowStockItems}</Text>
                        </Card.Content>
                    </Card>

                    <Card style={styles.secondaryCard}>
                        <Card.Content style={styles.secondaryContent}>
                            <View style={styles.secondaryIcon}>
                                <Text style={{ fontSize: 20 }}>📈</Text>
                            </View>
                            <Text style={styles.secondaryLabel}>Today</Text>
                            <Text style={styles.secondaryValue}>₹{(safeDashboardData.revenueToday / 1000).toFixed(1)}K</Text>
                        </Card.Content>
                    </Card>
                </View>

                <View style={styles.secondaryStatsRow}>
                    <Card style={styles.secondaryCard}>
                        <Card.Content style={styles.secondaryContent}>
                            <View style={styles.secondaryIcon}>
                                <Text style={{ fontSize: 20 }}>📦</Text>
                            </View>
                            <Text style={styles.monthLabel}>This Week</Text>
                            <Text style={styles.monthValue}>₹{(safeDashboardData.revenueLast7Days / 100000).toFixed(1)}L</Text>
                        </Card.Content>
                    </Card>
                    <Card style={styles.secondaryCard}>
                        <Card.Content style={styles.secondaryContent}>
                            <View style={styles.secondaryIcon}>
                                <Text style={{ fontSize: 20 }}>📈</Text>
                            </View>
                            <Text style={styles.monthLabel}>This Month</Text>
                            <Text style={styles.monthValue}>₹{(safeDashboardData.revenueLast30Days / 100000).toFixed(1)}L</Text>
                        </Card.Content>
                    </Card>
                    <Card style={styles.secondaryCard}>
                        <Card.Content style={styles.secondaryContent}>
                            <View style={styles.secondaryIcon}>
                                <Avatar.Icon size={40} icon="file-document" style={styles.primaryIconOverlay} />
                            </View>
                            <Text style={styles.monthLabel}>Today Invoices </Text>
                            <Text style={styles.monthValue}>{safeDashboardData.invoicesToday}</Text>
                        </Card.Content>
                    </Card>
                </View>

                <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionTitle}>Quick access</Text>
                    <Text style={styles.sectionCaption}>Jump into daily actions</Text>
                </View>

                <View style={styles.quickActionsModern}>
                    <Card
                        style={[styles.actionCardModern, { backgroundColor: "#DCF4FF" }]}
                        onPress={() => navigation.getParent()?.navigate("InvoicesTab")}
                    >
                        <Card.Content style={styles.actionContentModern}>
                            <View style={styles.actionIconBg}>
                                <Text style={styles.actionEmoji}>📝</Text>
                            </View>
                            <Text style={styles.actionLabelModern}>Invoices ({safeDashboardData.totalInvoices}) </Text>
                        </Card.Content>
                    </Card>

                    <Card
                        style={[styles.actionCardModern, { backgroundColor: "#F3E8FF" }]}
                        onPress={() => navigation.getParent()?.navigate("ProductsTab")}
                    >
                        <Card.Content style={styles.actionContentModern}>
                            <View style={styles.actionIconBg}>
                                <Text style={styles.actionEmoji}>📦</Text>
                            </View>
                            <Text style={styles.actionLabelModern}>Products ({safeDashboardData.totalProducts})</Text>
                        </Card.Content>
                    </Card>

                    <Card
                        style={[styles.actionCardModern, { backgroundColor: "#DCF4FF" }]}
                        onPress={() => navigation.getParent()?.navigate("CustomersTab")
                        }
                    >
                        <Card.Content style={styles.actionContentModern}>
                            <View style={styles.actionIconBg}>
                                <Text style={styles.actionEmoji}>👥</Text>
                            </View>
                            <Text style={styles.actionLabelModern}>Customers ({safeDashboardData.totalCustomers})</Text>
                        </Card.Content>
                    </Card>
                </View>

                <View style={styles.bottomSpace} />
            </ScrollView>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#FFFFFF",
    },
    scrollContent: {
        paddingTop: 12,
        paddingBottom: 24,
    },
    overviewCard: {
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 20,
        backgroundColor: "#F7F2FF",
        borderWidth: 1,
        borderColor: "#E9DDFD",
    },
    overviewContent: {
        paddingVertical: 16,
        paddingHorizontal: 16,
    },
    overviewHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 14,
    },
    overviewTextBlock: {
        flex: 1,
        paddingRight: 12,
    },
    overviewKicker: {
        color: "#7A58B5",
        fontSize: 11,
        fontWeight: "700",
        textTransform: "uppercase",
        letterSpacing: 0.7,
        marginBottom: 4,
    },
    overviewTitle: {
        fontSize: 22,
        fontWeight: "800",
        color: "#24153D",
        marginBottom: 4,
    },
    overviewSubtitle: {
        color: "#7B728E",
        fontSize: 13,
        fontWeight: "500",
    },
    overviewAvatar: {
        backgroundColor: "#4a2090",
    },
    overviewHighlights: {
        flexDirection: "row",
        gap: 10,
    },
    overviewChip: {
        flex: 1,
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        paddingVertical: 12,
        paddingHorizontal: 12,
    },
    overviewChipLabel: {
        color: "#7B728E",
        fontSize: 11,
        fontWeight: "600",
        marginBottom: 4,
        textTransform: "uppercase",
    },
    overviewChipValue: {
        color: "#24153D",
        fontSize: 18,
        fontWeight: "800",
    },
    primaryStatsContainer: {
        flexDirection: "row",
        paddingHorizontal: 16,
        gap: 12,
        marginBottom: 16,
    },
    primaryStatCard: {
        flex: 1,
        borderRadius: 16,
        elevation: 4,
    },
    primaryStatContent: {
        paddingVertical: 16,
        paddingHorizontal: 12,
    },
    primaryStatHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 12,
    },
    primaryStatLabel: {
        color: "rgba(255, 255, 255, 0.85)",
        fontSize: 12,
        fontWeight: "600",
    },
    primaryIconOverlay: {
        backgroundColor: "rgba(255, 255, 255, 0.25)",
    },
    primaryStatValue: {
        color: "#fff",
        fontSize: 24,
        fontWeight: "700",
        marginBottom: 4,
    },
    primaryStatSubtext: {
        color: "rgba(255, 255, 255, 0.75)",
        fontSize: 12,
    },
    secondaryStatsRow: {
        flexDirection: "row",
        paddingHorizontal: 16,
        gap: 10,
        marginBottom: 16,
    },
    secondaryCard: {
        flex: 1,
        borderRadius: 12,
        elevation: 2,
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#F0F4F8",
    },
    secondaryContent: {
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 8,
    },
    secondaryIcon: {
        width: 44,
        height: 44,
        borderRadius: 10,
        backgroundColor: "#F0F7FF",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 8,
    },
    secondaryLabel: {
        fontSize: 12,
        color: "#6B7280",
        fontWeight: "500",
        marginBottom: 4,
    },
    secondaryValue: {
        fontSize: 16,
        color: "#1E7BE6",
        fontWeight: "700",
    },
    chartCard: {
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 16,
        elevation: 2,
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#F0F4F8",
    },
    chartContent: {
        paddingVertical: 16,
        paddingHorizontal: 16,
    },
    chartHeader: {
        marginBottom: 16,
    },
    chartTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1E7BE6",
    },
    chartSubtitle: {
        fontSize: 12,
        color: "#9CA3AF",
        marginTop: 2,
    },
    chart: {
        marginVertical: 8,
        borderRadius: 12,
        alignSelf: "center",
    },
    monthStatsContainer: {
        paddingHorizontal: 16,
        marginBottom: 16,
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 12,
    },
    monthCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        elevation: 1,
        paddingVertical: 2,
        borderWidth: 1,
        borderColor: "#F0F4F8",
        flex: 1,
    },
    monthLabel: {
        fontSize: 12,
        color: "#9CA3AF",
        fontWeight: "500",
    },
    monthValue: {
        fontSize: 20,
        color: "#1E7BE6",
        fontWeight: "700",
        marginTop: 4,
    },
    recentCard: {
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 16,
        elevation: 2,
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#F0F4F8",
    },
    recentCardContent: {
        paddingVertical: 4,
        paddingHorizontal: 4,
    },
    recentHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 12,
    },
    recentTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1E7BE6",
    },
    invoiceItemModern: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 12,
        paddingHorizontal: 12,
        alignItems: "center",
    },
    invoiceLeftModern: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
        gap: 12,
    },
    invoiceNumberBadge: {
        backgroundColor: "#E0F0FF",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    invoiceNumberText: {
        fontSize: 12,
        fontWeight: "700",
        color: "#1E7BE6",
    },
    invoiceDetailsModern: {
        flex: 1,
    },
    invoiceCustomerModern: {
        fontSize: 14,
        fontWeight: "600",
        color: "#1F2937",
    },
    invoiceDateModern: {
        fontSize: 12,
        color: "#9CA3AF",
        marginTop: 2,
    },
    invoiceRightModern: {
        alignItems: "flex-end",
        gap: 6,
    },
    invoiceAmountModern: {
        fontSize: 14,
        fontWeight: "700",
        color: "#1F2937",
    },
    statusChipModern: {
        height: 24,
        minWidth: 60,
    },
    chipTextModern: {
        fontSize: 10,
        fontWeight: "600",
        color: "#fff",
    },
    dividerModern: {
        marginHorizontal: 12,
        backgroundColor: "#E5E7EB",
    },
    emptyText: {
        textAlign: "center",
        color: "#9CA3AF",
        paddingVertical: 24,
        fontSize: 14,
    },
    sectionHeaderRow: {
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: "700",
        color: "#24153D",
        marginBottom: 2,
    },
    sectionCaption: {
        color: "#7B728E",
        fontSize: 12,
    },
    quickActionsModern: {
        flexDirection: "row",
        paddingHorizontal: 16,
        gap: 12,
        marginBottom: 16,
    },
    actionCardModern: {
        flex: 1,
        borderRadius: 12,
        elevation: 1,
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#F0F4F8",
    },
    actionContentModern: {
        alignItems: "center",
        paddingVertical: 12,
    },
    actionIconBg: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 8,
    },
    actionEmoji: {
        fontSize: 24,
    },
    actionLabelModern: {
        fontSize: 12,
        fontWeight: "600",
        color: "#1F2937",
        textAlign: "center",
    },
    bottomSpace: {
        height: 16,
    },
})

export default DashboardScreen
