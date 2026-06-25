import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types";
import ProductListScreen from "../screens/Inventory/ProductListScreen";
import AddProductScreen from "../screens/Inventory/AddProductScreen";
import { buildHeaderOptions } from "./headerOptions";
import { formTypeEnum } from "../types";


const Stack = createNativeStackNavigator<RootStackParamList>();

const ProductsStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ProductList"
        component={ProductListScreen}
        options={({ navigation }) =>
          buildHeaderOptions({
            title: 'Products',
            rightActions: [
              {
                icon: 'plus',
                onPress: () => navigation.navigate('ProductForm', { formType: formTypeEnum.ADD }),
              },
            ],
          })}
      />
      <Stack.Screen
        name="ProductForm"
        component={AddProductScreen}
        options={({ route }) =>
          buildHeaderOptions({
            title: route.params?.formType === formTypeEnum.EDIT ? 'Edit Product' : 'Add Product',
          })}
      />
    </Stack.Navigator>
  );
};


export default ProductsStack
