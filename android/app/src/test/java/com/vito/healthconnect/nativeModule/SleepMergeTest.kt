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

    @Test
    fun `gap de 4min se fusiona por tolerancia de 5min`() {
        val merged = mergeSleepIntervals(
            listOf(
                interval("2026-10-06T01:00:00Z", "2026-10-06T02:00:00Z"),
                interval("2026-10-06T02:04:00Z", "2026-10-06T03:00:00Z"),
            ),
        )
        assertEquals(1, merged.size)
        assertEquals(120, totalMinutes(merged))
    }

    @Test
    fun `gap de 30min no se fusiona`() {
        val merged = mergeSleepIntervals(
            listOf(
                interval("2026-10-06T01:00:00Z", "2026-10-06T02:00:00Z"),
                interval("2026-10-06T02:30:00Z", "2026-10-06T03:00:00Z"),
            ),
        )
        assertEquals(2, merged.size)
        assertEquals(90, totalMinutes(merged))
    }

    @Test
    fun `solo etapas dormidas cuentan awake se excluye`() {
        // Noche 23:00-07:00 (480min cama) pero 267min dormido + resto awake:
        // reproduce caso real 8.7h cama vs 4h27 reloj.
        val stages = listOf(
            Triple(Instant.parse("2026-10-05T23:00:00Z"), Instant.parse("2026-10-06T03:27:00Z"), 4),
            Triple(Instant.parse("2026-10-06T03:27:00Z"), Instant.parse("2026-10-06T07:00:00Z"), 1),
        )
        val only = sleepOnlyIntervals(stages)
        assertEquals(1, only.size)
        assertEquals(267, only.sumOf { (s, e) -> Duration.between(s, e).toMinutes() })
    }

    @Test
    fun `out of bed y awake in bed se excluyen`() {
        val stages = listOf(
            Triple(Instant.parse("2026-10-06T01:00:00Z"), Instant.parse("2026-10-06T02:00:00Z"), 5),
            Triple(Instant.parse("2026-10-06T02:00:00Z"), Instant.parse("2026-10-06T02:15:00Z"), 3),
            Triple(Instant.parse("2026-10-06T02:15:00Z"), Instant.parse("2026-10-06T02:30:00Z"), 7),
            Triple(Instant.parse("2026-10-06T02:30:00Z"), Instant.parse("2026-10-06T03:00:00Z"), 6),
        )
        val only = sleepOnlyIntervals(stages)
        assertEquals(2, only.size)
        assertEquals(90, only.sumOf { (s, e) -> Duration.between(s, e).toMinutes() })
    }
}
