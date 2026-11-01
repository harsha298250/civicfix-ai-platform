package com.civicfix.ai;

import com.civicfix.ai.dto.AiTriageResult;
import com.civicfix.ai.triage.DeterministicTriageEngine;
import com.civicfix.complaint.ComplaintPriority;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

class DeterministicTriageEngineTest {

    private DeterministicTriageEngine engine;

    @BeforeEach
    void setUp() {
        engine = new DeterministicTriageEngine();
    }

    @Test
    @DisplayName("Normal Case: Pothole report correctly classifies under ROADS with transparent reasoning")
    void testNormalRoadClassification() {
        AiTriageResult result = engine.evaluate(
                "Deep pothole on Anna Salai",
                "Large crater in the asphalt road causing vehicle slowdowns near Spencer Plaza.",
                "ROADS",
                ComplaintPriority.MEDIUM
        );

        assertNotNull(result);
        assertEquals("ROADS", result.getDetectedCategory());
        assertNotNull(result.getConfidence());
        assertTrue(result.getConfidence().compareTo(BigDecimal.valueOf(50.00)) >= 0);
        assertTrue(result.getConfidence().compareTo(BigDecimal.valueOf(95.00)) <= 0);
        assertNotNull(result.getExplanation());
        assertTrue(result.getExplanation().toLowerCase().contains("roads"));
        assertTrue(result.getExplanation().toLowerCase().contains("pothole") || result.getExplanation().toLowerCase().contains("asphalt"));
    }

    @Test
    @DisplayName("Normal Case: Water pipeline burst classifies under WATER_SEWERAGE with HIGH hazard rating")
    void testWaterPipelineBurst() {
        AiTriageResult result = engine.evaluate(
                "Drinking water pipeline burst",
                "Arterial water main flange burst flooding the road with drinking water leakage.",
                null,
                null
        );

        assertNotNull(result);
        assertEquals("WATER_SEWERAGE", result.getDetectedCategory());
        assertEquals(ComplaintPriority.HIGH, result.getRecommendedPriority());
        assertTrue(result.getHazardScore().contains("P2 - Elevated Hazard") || result.getHazardScore().contains("P1"));
        assertTrue(result.getExplanation().contains("pipeline burst") || result.getExplanation().contains("flange burst"));
    }

    @Test
    @DisplayName("Critical Hazard: Live wire triggers CRITICAL priority and P1 life-safety hazard score")
    void testCriticalLiveWireHazard() {
        AiTriageResult result = engine.evaluate(
                "Sparking power cable",
                "Broken streetlight with live wire snapped and sparking on the pedestrian footpath.",
                "STREET_LIGHT",
                ComplaintPriority.LOW // Citizen under-reported priority
        );

        assertNotNull(result);
        assertEquals("STREET_LIGHT", result.getDetectedCategory());
        // Must elevate under-reported priority to CRITICAL
        assertEquals(ComplaintPriority.CRITICAL, result.getRecommendedPriority());
        assertEquals("P1 - Critical Hazard: Life Safety Risk", result.getHazardScore());
        assertTrue(result.getExplanation().contains("Live / exposed electrical wiring"));
        assertFalse(result.getRuleMatches().isEmpty());
    }

    @Test
    @DisplayName("Critical Hazard: Open manhole triggers CRITICAL priority elevation")
    void testCriticalOpenManhole() {
        AiTriageResult result = engine.evaluate(
                "Missing manhole cover",
                "Deep open drain shaft on the main road, extreme fall hazard for bikes and pedestrians.",
                "DRAINAGE",
                ComplaintPriority.MEDIUM
        );

        assertNotNull(result);
        assertEquals(ComplaintPriority.CRITICAL, result.getRecommendedPriority());
        assertTrue(result.getHazardScore().contains("P1"));
        assertTrue(result.getExplanation().contains("Open manhole") || result.getExplanation().contains("open drain shaft"));
    }

    @Test
    @DisplayName("Ambiguous Complaint: Vague complaint text safely falls back to category hint without error")
    void testAmbiguousComplaint() {
        AiTriageResult result = engine.evaluate(
                "Issue near my corner",
                "Something looks broken here please check immediately.",
                "PARKS",
                ComplaintPriority.LOW
        );

        assertNotNull(result);
        assertEquals("PARKS", result.getDetectedCategory()); // Respected valid category hint
        assertEquals(ComplaintPriority.LOW, result.getRecommendedPriority());
        assertEquals(BigDecimal.valueOf(50.00).setScale(2), result.getConfidence());
        assertTrue(result.getExplanation().contains("defaulted to PARKS"));
    }

    @Test
    @DisplayName("Multi-intent Complaint: Evaluates highest weighted municipal category")
    void testMultiIntentComplaint() {
        AiTriageResult result = engine.evaluate(
                "Overflowing storm drain canal near street light",
                "The canal drain is completely clogged with rainwater stagnation and flood runoff.",
                null,
                ComplaintPriority.MEDIUM
        );

        assertNotNull(result);
        assertEquals("DRAINAGE", result.getDetectedCategory());
        assertTrue(result.getConfidence().compareTo(BigDecimal.valueOf(60.00)) >= 0);
    }

    @Test
    @DisplayName("Invalid Input: Null title and description returns safe fallback object without throwing")
    void testNullInputs() {
        AiTriageResult result = engine.evaluate(null, null, "GARBAGE", ComplaintPriority.MEDIUM);

        assertNotNull(result);
        assertEquals("GARBAGE", result.getDetectedCategory());
        assertEquals(ComplaintPriority.MEDIUM, result.getRecommendedPriority());
        assertEquals(BigDecimal.valueOf(50.00), result.getConfidence());
        assertTrue(result.getExplanation().contains("fallback"));
    }

    @Test
    @DisplayName("Invalid Input: Whitespace-only strings return safe fallback object without throwing")
    void testWhitespaceInputs() {
        AiTriageResult result = engine.evaluate("   ", "\t\n  ", null, null);

        assertNotNull(result);
        assertEquals("GENERAL", result.getDetectedCategory());
        assertEquals(ComplaintPriority.MEDIUM, result.getRecommendedPriority());
        assertNotNull(result.getExplanation());
    }

    @Test
    @DisplayName("Transparency: Confidence metric is honest rule-match metric, not fabricated AI probability")
    void testHeuristicConfidenceBounds() {
        AiTriageResult normal = engine.evaluate("Standard Pothole", "Pothole in the road", "ROADS", ComplaintPriority.MEDIUM);
        assertNotNull(normal.getConfidence());
        // Ensure no fake 99.9% or 100% scores are produced
        assertTrue(normal.getConfidence().doubleValue() <= 92.50);
        assertTrue(normal.getConfidence().doubleValue() >= 50.00);
    }

    @Test
    @DisplayName("Tamil Multilingual Triage: Correctly classifies at least 6 Tamil civic hazard complaints")
    void testTamilSentencesTriageClassification() {
        // 1. Roads & Potholes (தார் சாலை / குழி)
        AiTriageResult roadResult = engine.evaluate(
                "சாலையில் பெரிய குழி",
                "அண்ணா சாலையில் உள்ள ஆழமான குழியால் இருசக்கர வாகனங்கள் விபத்துக்குள்ளாகின்றன.",
                null,
                null
        );
        assertEquals("ROADS", roadResult.getDetectedCategory());
        assertTrue(roadResult.getExplanation().toLowerCase().contains("roads"));

        // 2. Water & Sewerage Leakage (குடிநீர் குழாய் உடைப்பு)
        AiTriageResult waterResult = engine.evaluate(
                "குடிநீர் குழாய் உடைப்பு",
                "தெருவில் தண்ணீர் குழாய் உடைந்து குடிநீர் பெருமளவில் வீணாகிறது.",
                null,
                null
        );
        assertEquals("WATER_SEWERAGE", waterResult.getDetectedCategory());

        // 3. Streetlights & Electrical (தெருவிளக்கு பழுது)
        AiTriageResult lightResult = engine.evaluate(
                "தெருவிளக்கு எரியவில்லை",
                "எங்கள் தெருவில் விளக்கு கம்பம் பழுதடைந்து இரவு முழுவதும் இருட்டாக உள்ளது.",
                null,
                null
        );
        assertEquals("STREET_LIGHT", lightResult.getDetectedCategory());

        // 4. Solid Waste & Garbage (குப்பை தொட்டி துர்நாற்றம்)
        AiTriageResult garbageResult = engine.evaluate(
                "குப்பை அள்ளப்படவில்லை",
                "தெரு மூலையில் குப்பை தொட்டி நிரம்பி கடுமையான துர்நாற்றம் வீசுகிறது.",
                null,
                null
        );
        assertEquals("GARBAGE", garbageResult.getDetectedCategory());

        // 5. Drainage & Storm Drains (மழைநீர் வடிகால் அடைப்பு)
        AiTriageResult drainageResult = engine.evaluate(
                "மழைநீர் வடிகால் அடைப்பு",
                "மழைநீர் வடிகால் கால்வாயில் அடைப்பு ஏற்பட்டு சாலையில் தேங்கிய நீர் தேங்குகிறது.",
                null,
                null
        );
        assertEquals("DRAINAGE", drainageResult.getDetectedCategory());

        // 6. Parks & Fallen Trees (பூங்கா / விழுந்த மரம்)
        AiTriageResult parkResult = engine.evaluate(
                "சாலையில் விழுந்த மரக்கிளை",
                "பூங்கா அருகே பலத்த காற்றால் மரக்கிளை முறிந்து விழுந்துள்ளது.",
                null,
                null
        );
        assertEquals("PARKS", parkResult.getDetectedCategory());

        // 7. Public Transport & Bus Stop (பேருந்து நிறுத்தம் நிழற்குடை)
        AiTriageResult transitResult = engine.evaluate(
                "பேருந்து நிறுத்தம் சேதம்",
                "முக்கிய பேருந்து நிறுத்தம் நிழற்குடை சேதமடைந்து பயணிகள் நிற்க முடியவில்லை.",
                null,
                null
        );
        assertEquals("PUBLIC_TRANSPORT", transitResult.getDetectedCategory());
    }
}
