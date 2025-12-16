#!/bin/bash

# ================================================
# نصب خودکار موبایل - React Native
# Mobile Auto Installer - React Native 2025
# ================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

PROJECT_NAME="MyMobileApp"
INSTALL_DIR="./mobile-app"
PACKAGE_NAME="com.company.mobileapp"

log() {
    echo -e "$1"
}

print_header() {
    clear
    log "${CYAN}============================================${NC}"
    log "${CYAN}    نصاب خودکار موبایل - React Native${NC}"
    log "${CYAN}    Mobile Auto Installer - React Native${NC}"
    log "${CYAN}============================================${NC}"
    echo ""
}

check_requirements() {
    log "${BLUE}🔍 بررسی پیش‌نیازها...${NC}"
    
    # Check Node.js
    if ! command -v node >/dev/null 2>&1; then
        log "${RED}❌ Node.js نصب نشده است${NC}"
        log "${YELLOW}نصب Node.js...${NC}"
        curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
        sudo apt-get install -y nodejs
    fi
    
    # Check npm
    if ! command -v npm >/dev/null 2>&1; then
        log "${RED}❌ npm نصب نشده است${NC}"
        exit 1
    fi
    
    # Check Java (required for Android)
    if ! command -v java >/dev/null 2>&1; then
        log "${YELLOW}نصب OpenJDK 11...${NC}"
        sudo apt-get update
        sudo apt-get install -y openjdk-11-jdk
    fi
    
    log "${GREEN}✅ پیش‌نیازها آماده هستند${NC}"
}

install_react_native_cli() {
    log "${BLUE}📦 نصب React Native CLI...${NC}"
    
    # Install React Native CLI globally
    npm install -g react-native-cli @react-native-community/cli
    
    # Install additional tools
    npm install -g react-native-rename
    npm install -g yarn
    
    log "${GREEN}✅ React Native CLI نصب شد${NC}"
}

setup_android_sdk() {
    log "${BLUE}🤖 تنظیم Android SDK...${NC}"
    
    ANDROID_DIR="$HOME/Android/Sdk"
    mkdir -p "$ANDROID_DIR"
    
    # Download Android Command Line Tools
    cd "$HOME"
    wget -q https://dl.google.com/android/repository/commandlinetools-linux-9477386_latest.zip
    unzip -q commandlinetools-linux-9477386_latest.zip
    mkdir -p "$ANDROID_DIR/cmdline-tools/latest"
    mv cmdline-tools/* "$ANDROID_DIR/cmdline-tools/latest/" 2>/dev/null || true
    rm -f commandlinetools-linux-9477386_latest.zip
    
    # Set environment variables
    export ANDROID_HOME="$ANDROID_DIR"
    export PATH="$PATH:$ANDROID_DIR/cmdline-tools/latest/bin:$ANDROID_DIR/platform-tools"
    
    # Accept licenses and install SDK components
    yes | sdkmanager --licenses
    sdkmanager "platform-tools" "platforms;android-33" "build-tools;33.0.0"
    
    # Create environment file
    cat >> ~/.bashrc << 'EOF'

# Android SDK
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin
export PATH=$PATH:$ANDROID_HOME/platform-tools
EOF
    
    log "${GREEN}✅ Android SDK تنظیم شد${NC}"
}

setup_ios_development() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        log "${BLUE}🍎 تنظیم iOS Development...${NC}"
        
        # Install Xcode Command Line Tools
        xcode-select --install
        
        # Install CocoaPods
        sudo gem install cocoapods
        
        log "${GREEN}✅ iOS Development تنظیم شد${NC}"
    else
        log "${YELLOW}⚠️  iOS development فقط روی macOS پشتیبانی می‌شود${NC}"
    fi
}

create_react_native_project() {
    log "${BLUE}🚀 ایجاد پروژه React Native...${NC}"
    
    # Create project directory
    mkdir -p "$INSTALL_DIR"
    cd "$INSTALL_DIR"
    
    # Initialize React Native project
    npx react-native@latest init "$PROJECT_NAME" --template react-native-template-typescript
    
    cd "$PROJECT_NAME"
    
    log "${GREEN}✅ پروژه React Native ایجاد شد${NC}"
}

setup_database_integration() {
    log "${BLUE}🗄️  تنظیم پایگاه داده موبایل...${NC}"
    
    cd "$PROJECT_NAME"
    
    # Install database packages
    npm install @react-native-async-storage/async-storage
    npm install @react-native-community/netinfo
    npm install @react-native-firebase/app
    npm install @react-native-firebase/firestore
    npm install react-native-sqlite-storage
    npm install realm
    npm install @react-native-masked-view/masked-view
    npm install @react-navigation/native
    npm install @react-navigation/stack
    npm install react-native-reanimated
    npm install react-native-gesture-handler
    npm install react-native-safe-area-context
    npm install react-native-screens
    npm install react-native-vector-icons
    
    # iOS specific
    if [[ "$OSTYPE" == "darwin"* ]]; then
        cd ios && pod install && cd ..
    fi
    
    # Configure app.json
    cat > app.json << EOF
{
  "expo": {
    "name": "$PROJECT_NAME",
    "slug": "$(echo $PROJECT_NAME | tr '[:upper:]' '[:lower:]' | sed 's/ //g')",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#FFFFFF"
      },
      "package": "$PACKAGE_NAME"
    },
    "web": {
      "favicon": "./assets/favicon.png"
    }
  }
}
EOF

    log "${GREEN}✅ پایگاه داده موبایل تنظیم شد${NC}"
}

create_app_components() {
    log "${BLUE}📱 ایجاد کامپوننت‌های اپلیکیشن...${NC}"
    
    cd "$PROJECT_NAME"
    
    # Create main App component with database integration
    cat > App.tsx << 'EOF'
import React, {useState, useEffect} from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  Button,
  Alert,
  View,
  TouchableOpacity,
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

const Stack = createStackNavigator();

interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

const DatabaseManager = {
  // SQLite operations for offline storage
  saveUser: async (user: Omit<User, 'id' | 'createdAt'>) => {
    try {
      const newUser: User = {
        ...user,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
      };
      
      const existingUsers = await AsyncStorage.getItem('users');
      const users = existingUsers ? JSON.parse(existingUsers) : [];
      users.push(newUser);
      
      await AsyncStorage.setItem('users', JSON.stringify(users));
      
      // Sync to cloud if online
      const netState = await NetInfo.fetch();
      if (netState.isConnected) {
        // TODO: Sync to Firestore or other cloud database
        console.log('Syncing to cloud database...');
      }
      
      return newUser;
    } catch (error) {
      console.error('Error saving user:', error);
      throw error;
    }
  },

  getUsers: async (): Promise<User[]> => {
    try {
      const usersJson = await AsyncStorage.getItem('users');
      return usersJson ? JSON.parse(usersJson) : [];
    } catch (error) {
      console.error('Error getting users:', error);
      return [];
    }
  },

  deleteUser: async (userId: string) => {
    try {
      const users = await DatabaseManager.getUsers();
      const filteredUsers = users.filter(user => user.id !== userId);
      await AsyncStorage.setItem('users', JSON.stringify(filteredUsers));
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  },
};

const HomeScreen: React.FC<{navigation: any}> = ({ navigation }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const userList = await DatabaseManager.getUsers();
      setUsers(userList);
    } catch (error) {
      Alert.alert('خطا', 'خطا در بارگذاری داده‌ها');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <Text style={styles.title}>🏠 صفحه اصلی</Text>
        <Text style={styles.subtitle}>تعداد کاربران: {users.length}</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('AddUser')}>
          <Text style={styles.buttonText}>➕ افزودن کاربر</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.refreshButton]}
          onPress={loadUsers}>
          <Text style={styles.buttonText}>🔄 بروزرسانی</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.userList}>
        {users.map(user => (
          <View key={user.id} style={styles.userCard}>
            <Text style={styles.userName}>{user.name}</Text>
            <Text style={styles.userEmail}>{user.email}</Text>
            <Text style={styles.userDate}>
              {new Date(user.createdAt).toLocaleDateString('fa-IR')}
            </Text>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => {
                Alert.alert(
                  'حذف کاربر',
                  'آیا مطمئن هستید؟',
                  [
                    {text: 'لغو', style: 'cancel'},
                    {
                      text: 'حذف',
                      style: 'destructive',
                      onPress: async () => {
                        await DatabaseManager.deleteUser(user.id);
                        loadUsers();
                      },
                    },
                  ],
                );
              }}>
              <Text style={styles.deleteButtonText}>🗑️ حذف</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const AddUserScreen: React.FC<{navigation: any}> = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const saveUser = async () => {
    if (!name.trim() || !email.trim()) {
      Alert.alert('خطا', 'لطفاً تمام فیلدها را پر کنید');
      return;
    }

    try {
      await DatabaseManager.saveUser({ name, email });
      Alert.alert('موفقیت', 'کاربر با موفقیت ذخیره شد');
      navigation.goBack();
    } catch (error) {
      Alert.alert('خطا', 'خطا در ذخیره کاربر');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.form}>
        <Text style={styles.title}>➕ افزودن کاربر جدید</Text>
        
        <TextInput
          style={styles.input}
          placeholder="نام کاربر"
          value={name}
          onChangeText={setName}
        />
        
        <TextInput
          style={styles.input}
          placeholder="ایمیل"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
        />
        
        <View style={styles.formButtons}>
          <TouchableOpacity style={styles.button} onPress={saveUser}>
            <Text style={styles.buttonText}>💾 ذخیره</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={() => navigation.goBack()}>
            <Text style={styles.buttonText}>❌ لغو</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const App: React.FC = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: '🏠 صفحه اصلی' }}
        />
        <Stack.Screen
          name="AddUser"
          component={AddUserScreen}
          options={{ title: '➕ افزودن کاربر' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2196F3',
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: 'white',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
  },
  button: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  refreshButton: {
    backgroundColor: '#FF9800',
  },
  cancelButton: {
    backgroundColor: '#f44336',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  userList: {
    flex: 1,
    padding: 10,
  },
  userCard: {
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  userDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  deleteButton: {
    backgroundColor: '#f44336',
    padding: 8,
    borderRadius: 5,
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 12,
  },
  form: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    marginBottom: 15,
    borderRadius: 8,
    fontSize: 16,
  },
  formButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
});

export default App;
EOF

    # Create TypeScript config
    cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "allowJs": true,
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "jsx": "react-native",
    "lib": ["dom", "es6"],
    "moduleResolution": "node",
    "noEmit": true,
    "strict": true,
    "target": "es6",
    "resolveJsonModule": true,
    "skipLibCheck": true
  }
}
EOF

    log "${GREEN}✅ کامپوننت‌های اپلیکیشن ایجاد شدند${NC}"
}

build_apk() {
    log "${BLUE}🔨 ساخت APK...${NC}"
    
    cd "$PROJECT_NAME"
    
    # Generate Android bundle
    cd android
    ./gradlew bundleRelease
    
    cd ..
    
    # Create APK from bundle
    cd android
    ./gradlew assembleRelease
    
    log "${GREEN}✅ APK ساخته شد${NC}"
    log "${CYAN}📱 مسیر APK: android/app/build/outputs/apk/release/app-release.apk${NC}"
}

build_ios() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        log "${BLUE}🍎 ساخت iOS App...${NC}"
        
        cd "$PROJECT_NAME"
        
        # Install pods
        cd ios && pod install && cd ..
        
        # Build for iOS
        xcodebuild -workspace ios/MyMobileApp.xcworkspace \
                   -scheme MyMobileApp \
                   -configuration Release \
                   -destination generic/platform=iOS \
                   -archivePath MyMobileApp.xcarchive \
                   archive
        
        log "${GREEN}✅ iOS App ساخته شد${NC}"
        log "${CYAN}🍎 فایل آرشیو: ios/MyMobileApp.xcarchive${NC}"
    else
        log "${YELLOW}⚠️  ساخت iOS فقط روی macOS ممکن است${NC}"
    fi
}

print_completion_mobile() {
    log "${CYAN}============================================${NC}"
    log "${GREEN}🎉 نصب موبایل تکمیل شد!${NC}"
    log "${CYAN}============================================${NC}"
    log ""
    log "${BLUE}📱 اطلاعات پروژه:${NC}"
    log "   نام پروژه: $PROJECT_NAME"
    log "   پلتفرم: React Native"
    log "   پکیج: $PACKAGE_NAME"
    log "   مسیر: $INSTALL_DIR/$PROJECT_NAME"
    log ""
    log "${YELLOW}💡 دستورات مفید:${NC}"
    log "   اجرای روی Android: cd $INSTALL_DIR/$PROJECT_NAME && npx react-native run-android"
    log "   اجرای روی iOS: cd $INSTALL_DIR/$PROJECT_NAME && npx react-native run-ios"
    log "   ساخت APK: cd $INSTALL_DIR/$PROJECT_NAME && cd android && ./gradlew assembleRelease"
    log ""
    log "${GREEN}✅ اپلیکیشن موبایل آماده است!${NC}"
}

# Main execution
main() {
    print_header
    
    # Check if we're in the right directory
    if [[ -f "package.json" ]] && grep -q "react-native" package.json; then
        log "${YELLOW}⚠️  پروژه React Native موجود است. ادامه می‌دهیم...${NC}"
    else
        check_requirements
        install_react_native_cli
        setup_android_sdk
        setup_ios_development
        create_react_native_project
    fi
    
    setup_database_integration
    create_app_components
    
    # Build for Android
    if [[ "$PLATFORM" == "linux"* ]] || [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
        build_apk
    fi
    
    # Build for iOS if on macOS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        build_ios
    fi
    
    print_completion_mobile
}

# Run main function
main "$@"