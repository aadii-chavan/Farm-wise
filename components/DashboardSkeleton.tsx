import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions, ScrollView } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withRepeat, 
  withSequence, 
  withTiming 
} from 'react-native-reanimated';
import { Palette } from '@/constants/Colors';

const { width } = Dimensions.get('window');

const SkeletonPulse = ({ style }: { style?: any }) => {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 800 }),
        withTiming(0.3, { duration: 800 })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return <Animated.View style={[styles.skeleton, style, animatedStyle]} />;
};

export function DashboardSkeleton() {
  return (
    <ScrollView style={styles.container} scrollEnabled={false}>
      {/* Header Skeleton */}
      <View style={styles.headerSkeleton}>
        <View style={styles.headerTop}>
          <View>
            <SkeletonPulse style={styles.greetingText} />
            <SkeletonPulse style={styles.dateText} />
          </View>
          <SkeletonPulse style={styles.notifIcon} />
        </View>
        
        <View style={styles.balanceCard}>
          <SkeletonPulse style={styles.balanceLabel} />
          <SkeletonPulse style={styles.balanceAmount} />
          <SkeletonPulse style={styles.seasonBadge} />
        </View>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <SkeletonPulse style={styles.iconCircle} />
          <SkeletonPulse style={styles.statLabel} />
          <SkeletonPulse style={styles.statValue} />
        </View>
        <View style={styles.statCard}>
          <SkeletonPulse style={styles.iconCircle} />
          <SkeletonPulse style={styles.statLabel} />
          <SkeletonPulse style={styles.statValue} />
        </View>
      </View>

      {/* Plots Horizontal */}
      <View style={styles.sectionHeader}>
        <SkeletonPulse style={styles.sectionTitle} />
      </View>
      <View style={styles.horizontalScroll}>
        {[1, 2, 3].map(i => (
          <View key={i} style={styles.plotCard}>
            <SkeletonPulse style={styles.plotName} />
            <SkeletonPulse style={styles.plotCrop} />
            <SkeletonPulse style={styles.plotStat} />
          </View>
        ))}
      </View>

      {/* Analysis Card */}
      <View style={styles.sectionHeader}>
        <SkeletonPulse style={styles.sectionTitle} />
      </View>
      <View style={styles.analysisCard}>
        <View style={styles.analysisHeader}>
          <View>
            <SkeletonPulse style={styles.analysisTitle} />
            <SkeletonPulse style={styles.analysisSubtitle} />
          </View>
          <SkeletonPulse style={styles.analysisChip} />
        </View>
        <View style={styles.breakdownItem}>
          <SkeletonPulse style={styles.breakdownHeader} />
          <SkeletonPulse style={styles.progressBar} />
        </View>
        <View style={styles.breakdownItem}>
          <SkeletonPulse style={styles.breakdownHeader} />
          <SkeletonPulse style={styles.progressBar} />
        </View>
      </View>

      {/* Recent Activity */}
      <View style={styles.sectionHeader}>
        <SkeletonPulse style={styles.sectionTitle} />
      </View>
      <View style={styles.activityList}>
        {[1, 2, 3].map(i => (
          <View key={i} style={styles.activityItem}>
            <SkeletonPulse style={styles.activityIcon} />
            <View style={{ flex: 1, gap: 6 }}>
              <SkeletonPulse style={styles.activityTitle} />
              <SkeletonPulse style={styles.activitySub} />
            </View>
            <SkeletonPulse style={styles.activityAmount} />
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  skeleton: {
    backgroundColor: '#E2E8F0',
    borderRadius: 8,
  },
  headerSkeleton: {
    backgroundColor: Palette.primary,
    paddingTop: 20,
    paddingHorizontal: 24,
    paddingBottom: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greetingText: {
    width: 120,
    height: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginBottom: 8,
  },
  dateText: {
    width: 180,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  notifIcon: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
  },
  balanceCard: {
    marginTop: 10,
  },
  balanceLabel: {
    width: 140,
    height: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginBottom: 8,
  },
  balanceAmount: {
    width: 200,
    height: 38,
    backgroundColor: 'rgba(255,255,255,0.4)',
    marginBottom: 12,
  },
  seasonBadge: {
    width: 100,
    height: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 20,
    gap: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 16,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 12,
  },
  statLabel: {
    width: 80,
    height: 12,
    marginBottom: 8,
  },
  statValue: {
    width: 100,
    height: 18,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    width: 150,
    height: 20,
  },
  horizontalScroll: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
  },
  plotCard: {
    width: 140,
    height: 100,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  plotName: {
    width: 80,
    height: 14,
    marginBottom: 6,
  },
  plotCrop: {
    width: 60,
    height: 10,
    marginBottom: 12,
  },
  plotStat: {
    width: 70,
    height: 16,
  },
  analysisCard: {
    marginHorizontal: 20,
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 16,
  },
  analysisHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  analysisTitle: {
    width: 140,
    height: 16,
    marginBottom: 6,
  },
  analysisSubtitle: {
    width: 100,
    height: 12,
  },
  analysisChip: {
    width: 80,
    height: 28,
    borderRadius: 14,
  },
  breakdownItem: {
    marginBottom: 16,
  },
  breakdownHeader: {
    width: '100%',
    height: 14,
    marginBottom: 8,
  },
  progressBar: {
    width: '100%',
    height: 6,
    borderRadius: 3,
  },
  activityList: {
    paddingHorizontal: 20,
    gap: 12,
  },
  activityItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 12,
  },
  activityIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  activityTitle: {
    width: 120,
    height: 14,
  },
  activitySub: {
    width: 80,
    height: 10,
  },
  activityAmount: {
    width: 60,
    height: 16,
  },
});
