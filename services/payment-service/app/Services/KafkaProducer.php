<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use RdKafka\Conf;
use RdKafka\Producer;

class KafkaProducer
{
    private const TOPIC = 'payment-events';

    /**
     * Publish a payment event directly via the rdkafka extension.
     * No extra composer package needed — the ext-rdkafka PHP classes are used directly.
     * Fails silently so a Kafka outage never breaks the HTTP response.
     */
    public static function publish(string $eventType, array $data): void
    {
        try {
            $conf = new Conf();
            $conf->set('bootstrap.servers', env('KAFKA_BROKER', 'kafka:9092'));
            $conf->set('socket.timeout.ms', '5000');

            $producer = new Producer($conf);
            $topic    = $producer->newTopic(self::TOPIC);

            $payload = json_encode(array_merge($data, [
                'eventType' => $eventType,
                'timestamp' => now()->toIso8601String(),
            ]));

            $topic->produce(RD_KAFKA_PARTITION_UA, 0, $payload, (string) ($data['userId'] ?? 'system'));

            // Flush ensures the message is delivered before the PHP process moves on
            $result = $producer->flush(5000);
            if ($result !== RD_KAFKA_RESP_ERR_NO_ERROR) {
                Log::warning("[Kafka] Flush timed out for {$eventType}");
            }
        } catch (\Throwable $e) {
            Log::warning("[Kafka] Failed to publish {$eventType}: " . $e->getMessage());
        }
    }
}
