package com.vito.healthconnect.nativeModule

import java.time.Duration
import java.time.Instant
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * SCRUM-207: la app mostraba 9.1h vs 4.54h reales del reloj (ratio 2x)
 * porque las sesiones solapadas se sumaban sin fusionar.
 */
class SleepMergeTest {

    private fun interval(startIso: String, endIso: String) =
        Instant.parse(startIso) to Instant.parse(endIso)

    private fun totalMinutes(merged: List<Pair<Instant, Instant>>): Long =
        merged.sumOf { (s, e) -> Duration.between(s, e).toMinutes() }

    @Test
    fun `duplicado exacto colapsa en uno`() {
        val night = interval("2026-10-05T23:00:00Z", "2026-10-06T07:00:00Z")
        val merged = mergeSleepIntervals(listOf(night, night))
        assertEquals(1, merged.size)
        assertEquals(480, totalMinutes(merged))
    }

    @Test
    fun `solapada parcial no duplica`() {
        val merged = mergeSleepIntervals(
            listOf(
                interval("2026-10-05T23:00:00Z", "2026-10-06T07:00:00Z"),
                interval("2026-10-05T23:05:00Z", "2026-10-06T06:55:00Z"),
            ),
        )
        assertEquals(1, merged.size)
        assertEquals(480, totalMinutes(merged))
    }

    @Test
    fun `noche mas siesta disjunta se suman`() {
        val merged = mergeSleepIntervals(
            listOf(
                interval("2026-10-05T23:00:00Z", "2026-10-06T07:00:00Z"),
                interval("2026-10-06T14:00:00Z", "2026-10-06T14:30:00Z"),
            ),
        )
        assertEquals(2, merged.size)
        assertEquals(510, totalMinutes(merged))
    }

    @Test
    fun `lista vacia devuelve vacia`() {
        assertTrue(mergeSleepIntervals(emptyList()).isEmpty())
    }

    @Test
    fun `intervalo invalido se ignora`() {
        val merged = mergeSleepIntervals(
            listOf(
                interval("2026-10-06T07:00:00Z", "2026-10-05T23:00:00Z"),
                interval("2026-10-05T23:00:00Z", "2026-10-06T07:00:00Z"),
            ),
        )
        assertEquals(1, merged.size)
        assertEquals(480, totalMinutes(merged))
    }

    @Test
    fun `orden de entrada no importa`() {
        val merged = mergeSleepIntervals(
            listOf(
                interval("2026-10-06T14:00:00Z", "2026-10-06T14:30:00Z"),
                interval("2026-10-05T23:00:00Z", "2026-10-06T07:00:00Z"),
                interval("2026-10-05T23:00:00Z", "2026-10-06T07:00:00Z"),
            ),
        )
        assertEquals(2, merged.size)
        assertEquals(510, totalMinutes(merged))
    }
}
