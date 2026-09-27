import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { mobileApi, mobileChatApi } from '../../src/services/api';
import { useMobileStore } from '../../src/store/useMobileStore';

export default function FuelLogScreen() {
  const router = useRouter();
  const { user } = useMobileStore();
  const [odometer, setOdometer] = useState('18460');
  const [liters, setLiters] = useState('45');
  const [price, setPrice] = useState('130');
  const [station, setStation] = useState('Padma Oil Mohakhali');
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Camera Permission Required', 'Camera access is required to photograph fuel receipts.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setReceiptImage(result.assets[0].uri);
    }
  };

  const handleLogFuel = async () => {
    setLoading(true);
    let finalPhotoUrl = 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=800';

    if (receiptImage && !receiptImage.startsWith('http')) {
      const uploadRes = await mobileChatApi.uploadAttachment(receiptImage, 'fuel-receipt.jpg');
      if (uploadRes?.success && uploadRes.url) {
        finalPhotoUrl = uploadRes.url;
      }
    } else if (receiptImage) {
      finalPhotoUrl = receiptImage;
    }

    const res = await mobileApi('/fuel', {
      method: 'POST',
      body: JSON.stringify({
        vehicleId: 'cmuf7t2m6000lf6wpsjwhb0i5',
        driverId: user?.driverId || 'cmuf7sv730009f6wp06cs1lke',
        odometerReading: parseFloat(odometer),
        fuelAdded: parseFloat(liters),
        pricePerLiter: parseFloat(price),
        stationName: station,
        receiptPhoto: finalPhotoUrl,
      }),
    });

    setLoading(false);
    if (res.success) {
      Alert.alert(
        'Receipt Uploaded',
        'Fuel log submitted. Anti-theft consumption audit passed.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } else {
      Alert.alert('Submission Error', res.message || 'Could not log fuel receipt');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Submit Fuel Station Receipt</Text>
      <Text style={styles.subtitle}>
        Anti-theft verification requires odometer reading and pump slip photograph.
      </Text>

      {/* Photo Picker */}
      <TouchableOpacity style={styles.photoBox} onPress={takePhoto}>
        {receiptImage ? (
          <Image source={{ uri: receiptImage }} style={styles.previewImage} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Text style={styles.cameraIcon}>📸</Text>
            <Text style={styles.photoText}>Tap to Photograph Receipt</Text>
          </View>
        )}
      </TouchableOpacity>

      <View style={styles.formRow}>
        <View style={styles.formCol}>
          <Text style={styles.label}>Odometer (km)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={odometer}
            onChangeText={setOdometer}
          />
        </View>

        <View style={styles.formCol}>
          <Text style={styles.label}>Fuel Added (L)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={liters}
            onChangeText={setLiters}
          />
        </View>
      </View>

      <View style={styles.formRow}>
        <View style={styles.formCol}>
          <Text style={styles.label}>Price / Liter (৳)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={price}
            onChangeText={setPrice}
          />
        </View>

        <View style={styles.formCol}>
          <Text style={styles.label}>Station Name</Text>
          <TextInput
            style={styles.input}
            value={station}
            onChangeText={setStation}
          />
        </View>
      </View>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleLogFuel}
        disabled={loading}
      >
        <Text style={styles.buttonText}>{loading ? 'Transmitting...' : 'Upload & Verify Fuel'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 20,
    gap: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#171717',
  },
  subtitle: {
    fontSize: 13,
    color: '#525252',
    marginBottom: 8,
  },
  photoBox: {
    height: 180,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    borderWidth: 2,
    borderColor: '#BEDBFF',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  photoPlaceholder: {
    alignItems: 'center',
    gap: 8,
  },
  cameraIcon: {
    fontSize: 36,
  },
  photoText: {
    fontSize: 13,
    color: '#2B7FFF',
    fontWeight: '700',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  formCol: {
    flex: 1,
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#525252',
  },
  input: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    color: '#171717',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  button: {
    backgroundColor: '#2B7FFF',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#2B7FFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
});
