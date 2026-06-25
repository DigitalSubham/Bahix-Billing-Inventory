import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import { Text } from 'react-native-paper';

interface Props {
    label: string;
    value: string | number | null;
    items: { label: string; value: string | number }[];
    onChange: (value: any) => void;
    placeholder?: string;
    zIndex?: number;
    error?: string;
    searchable?: boolean;
}

const AppDropdownPicker: React.FC<Props> = ({
    label,
    value,
    items,
    onChange,
    placeholder = 'Select',
    zIndex = 2000,
    error,
    searchable = false,
}) => {
    const [open, setOpen] = useState(false);

    return (
        <View style={{ zIndex }}>
            <Text style={styles.label}>{label}</Text>

            <DropDownPicker
                listMode="MODAL"
                open={open}
                value={value}
                items={items}
                setOpen={setOpen}
                setValue={(cb) => onChange(cb(value))}
                setItems={() => { }}
                placeholder={placeholder}
                placeholderStyle={styles.placeholder}
                textStyle={styles.dropdownText}
                labelStyle={styles.dropdownLabel}
                style={[
                    styles.dropdown,
                    open && styles.dropdownOpen,
                    !!error && styles.errorBorder,
                ]}
                searchable={searchable}
                searchPlaceholder="Search..."
                searchContainerStyle={styles.searchContainer}
                searchTextInputStyle={styles.searchInput}
                dropDownContainerStyle={styles.dropdownContainer}
                closeAfterSelecting={true}
                listItemContainerStyle={styles.listItemContainer}
                listItemLabelStyle={styles.listItemLabel}
                selectedItemContainerStyle={styles.selectedItemContainer}
                selectedItemLabelStyle={styles.selectedItemLabel}
                itemSeparator={true}
                itemSeparatorStyle={styles.itemSeparator}
                modalContentContainerStyle={styles.modalContent}
                modalTitle={label}
                modalTitleStyle={styles.modalTitle}
                modalProps={{
                    presentationStyle: 'pageSheet',
                }}
                modalAnimationType="slide"
            />

            {!!error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );
};

export default React.memo(AppDropdownPicker);

const styles = StyleSheet.create({
    label: {
        fontSize: 12,
        color: '#5F5A73',
        marginBottom: 6,
        fontWeight: '700',
    },
    dropdown: {
        borderColor: '#D7CCE9',
        borderWidth: 1,
        borderRadius: 14,
        minHeight: 52,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 12,
    },
    dropdownOpen: {
        borderColor: '#4a2090',
        shadowColor: '#4a2090',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 2,
    },
    dropdownText: {
        color: '#24153D',
        fontSize: 14,
        fontWeight: '600',
    },
    dropdownLabel: {
        color: '#24153D',
    },
    placeholder: {
        color: '#8A829A',
        fontWeight: '500',
    },
    dropdownContainer: {
        borderColor: '#D7CCE9',
        borderRadius: 14,
        backgroundColor: '#FFFFFF',
    },
    errorBorder: {
        borderColor: '#f44336',
    },
    errorText: {
        color: '#f44336',
        fontSize: 12,
        marginTop: 4,
    },
    modalContent: {
        backgroundColor: "#F7F4FF",
        paddingHorizontal: 16,
        paddingTop: 18,
        paddingBottom: 28,
        flex: 1,
    },
    modalTitle: {
        fontWeight: "800",
        fontSize: 18,
        color: "#24153D",
        textAlign: "left",
        marginBottom: 14,
    },
    searchContainer: {
        borderBottomWidth: 0,
        paddingHorizontal: 0,
        marginBottom: 8,
    },
    searchInput: {
        borderColor: '#D7CCE9',
        borderRadius: 12,
        color: '#24153D',
        minHeight: 44,
    },
    listItemContainer: {
        minHeight: 48,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 14,
    },
    listItemLabel: {
        color: '#34264A',
        fontSize: 14,
        fontWeight: '600',
    },
    selectedItemContainer: {
        backgroundColor: '#EFE7FF',
    },
    selectedItemLabel: {
        color: '#4a2090',
        fontWeight: '800',
    },
    itemSeparator: {
        backgroundColor: '#EEE8F7',
        marginHorizontal: 8,
    },
});
