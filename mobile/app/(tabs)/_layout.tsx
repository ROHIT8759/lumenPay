import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { Home, Scan, Receipt, Settings } from 'lucide-react-native';

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: '#111827',
                    borderTopColor: '#1F2937',
                    height: 60,
                    paddingBottom: 8,
                    paddingTop: 8,
                },
                tabBarActiveTintColor: '#00E5FF',
                tabBarInactiveTintColor: '#6B7280',
                tabBarShowLabel: false,
            }}
        >
            <Tabs.Screen
                name="home"
                options={{
                    tabBarIcon: ({ color }) => <Home size={24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="scan"
                options={{
                    tabBarIcon: ({ color }) => (
                        <View className="bg-accent/20 p-3 rounded-full -mt-8 border border-accent/50">
                            <Scan size={28} color="#00E5FF" />
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="history"
                options={{
                    tabBarIcon: ({ color }) => <Receipt size={24} color={color} />,
                }}
            />
        </Tabs>
    );
}
