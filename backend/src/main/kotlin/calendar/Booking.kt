package calendar

import kotlinx.serialization.EncodeDefault
import kotlinx.serialization.ExperimentalSerializationApi
import kotlinx.serialization.Serializable
import java.time.Instant

/** Запись гостя на встречу. start/end — ISO-8601 UTC, полуоткрытый интервал [start, end). */
@OptIn(ExperimentalSerializationApi::class)
@Serializable
data class Booking(
    val id: String,
    val meetingTypeId: String,
    val start: String,
    val end: String,
    val guestName: String,
    /** Тема разговора; без темы поле не попадает в JSON (в контракте оно необязательное). */
    @EncodeDefault(EncodeDefault.Mode.NEVER)
    val topic: String? = null,
)

/** Интервал занятости [start, end) этой брони. */
fun Booking.toInterval(): Interval = Interval(Instant.parse(start), Instant.parse(end))

/** Тело запроса на создание записи: end сервер выводит из длительности типа. */
@Serializable
data class CreateBookingRequest(
    val meetingTypeId: String,
    val start: String,
    val guestName: String,
    val topic: String? = null,
)
