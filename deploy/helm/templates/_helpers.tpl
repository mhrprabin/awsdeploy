{{/*
Standard labels applied to every resource.
*/}}
{{- define "microservices.labels" -}}
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Selector labels for a specific service.
Usage: include "microservices.selectorLabels" (dict "name" $name)
*/}}
{{- define "microservices.selectorLabels" -}}
app: {{ .name }}
{{- end }}

{{/*
Full image reference: registry/image:tag
*/}}
{{- define "microservices.image" -}}
{{- $global := .global -}}
{{- $svc := .svc -}}
{{- if $global.registry -}}
{{ $global.registry }}/{{ $svc.image }}:{{ $svc.tag | default $global.imageTag }}
{{- else -}}
{{ $svc.image }}:{{ $svc.tag | default $global.imageTag }}
{{- end -}}
{{- end }}
