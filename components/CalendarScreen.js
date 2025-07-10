import React, { useState } from 'react';
import { View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import ModalAgenda from './ModalAgenda.js';

export default function CalendarScreen() {
  const [selectedDate, setSelectedDate] = useState(null);

  return (
    <View style={{ flex: 1 }}>
      <Calendar
        onDayPress={(day) => setSelectedDate(day.dateString)}
        markedDates={{
          [selectedDate]: { selected: true, selectedColor: '#00adf5' }
        }}
      />
      {selectedDate && (
        <ModalAgenda
          date={selectedDate}
          onClose={() => setSelectedDate(null)}
        />
      )}
    </View>
  );
}
