Attribute VB_Name = "CreateDocuments"
' ==========================================================
' МАКРОС ДЛЯ АВТОМАТИЗАЦИИ ДОКУМЕНТОВ СОВЕТА ДИРЕКТОРОВ
' ==========================================================
' Изменения:
' 1. Убрано ограничение в 250 символов — теперь текст вопросов
'    и формулировок вставляется полностью, без обрезки.
' 2. Добавлена замена тега <<Formulation>> в Решении (ранее
'    он не обрабатывался) — теперь где стоит этот тег,
'    будет подставляться принятое решение, а не вопрос.
' 3. Из текста формулировки решения автоматически убирается
'    начальная нумерация вида "1. ", "2. " и т.д.
' ==========================================================

Sub CreateDocuments()
    ' === НАСТРОЙКА ОБРАБОТКИ ОШИБОК ===
    On Error GoTo ErrorHandler

    Dim wdApp As Object
    Dim wdDoc As Object
    Dim fso As Object
    
    Dim folderPath As String
    Dim savePath As String
    
    Dim bulletinCount As Integer
    Dim protocolCount As Integer
    Dim reshenieCount As Integer
    
    Dim ws As Worksheet
    Set ws = ActiveSheet
    
    Set fso = CreateObject("Scripting.FileSystemObject")
    
    ' ========================================
    ' 1. ПРОВЕРКА ФАЙЛОВ
    ' ========================================
    folderPath = ActiveWorkbook.Path
    If Right(folderPath, 1) <> "\" Then folderPath = folderPath & "\"
    
    If Not fso.FileExists(folderPath & "Biulleten_template.docx") Or _
       Not fso.FileExists(folderPath & "Protokol_template.docx") Or _
       Not fso.FileExists(folderPath & "Reshenie_template.docx") Then
        MsgBox "Не найдены файлы шаблонов в папке: " & folderPath, vbCritical
        Exit Sub
    End If
    
    bulletinCount = 0: protocolCount = 0: reshenieCount = 0
    
    ' ========================================
    ' 2. ЧТЕНИЕ ДАННЫХ ИЗ EXCEL
    ' ========================================
    Dim companyFull As String, companyShort As String, ogrn As String
    Dim dateMeeting As String, protocolNumber As String
    Dim chairman As String, secretary As String, secretaryInstr As String
    Dim votesFor As String, votesAgainst As String, votesAbstained As String
    Dim fioVotesFor As String, membersRaw As String, place As String
    Dim dateOfRequest As String
    Dim countStr As String
    
    Dim membersArray() As String
    Dim questionsArray(0 To 9) As String
    Dim formulationsArray(0 To 9) As String
    
    Dim questionCount As Integer
    Dim j As Integer, q As Integer
    Dim memberFIO As String, membersList As String

    ' Считываем поля с помощью функции GetVal
    protocolNumber = GetVal(ws, "Номер протокола")
    companyShort = GetVal(ws, "Сокращенное наименование")
    companyFull = GetVal(ws, "Полное наименование")
    ogrn = GetVal(ws, "ОГРН")
    place = GetVal(ws, "Место нахождения")
    membersRaw = GetVal(ws, "Члены совета директоров")
    chairman = GetVal(ws, "Председатель")
    secretary = GetVal(ws, "Секретарь")
    secretaryInstr = GetInstrumentalCase(secretary)
    
    votesFor = GetVal(ws, "Сколько за")
    votesAgainst = GetVal(ws, "Сколько против")
    votesAbstained = GetVal(ws, "Воздержались")
    fioVotesFor = GetVal(ws, "ФИО проголосовавших за")
    
    dateMeeting = GetVal(ws, "Дата заседания")
    dateOfRequest = GetVal(ws, "Дата требования")
    
    If companyFull = "" Then companyFull = companyShort
    If dateOfRequest = "" Then dateOfRequest = dateMeeting
    If votesFor = "" Then votesFor = "0"
    If votesAgainst = "" Then votesAgainst = "0"
    If votesAbstained = "" Then votesAbstained = "0"
    
    ' === ЧТЕНИЕ КОЛИЧЕСТВА ВОПРОСОВ ===
    countStr = GetVal(ws, "Количество вопросов")
    
    ' Считываем тексты всех вопросов
    Call ReadAllQuestionsData(ws, questionsArray, formulationsArray)
    
    ' Определяем сколько оставить
    If IsNumeric(countStr) And Val(countStr) > 0 Then
        questionCount = Val(countStr)
    Else
        questionCount = CountFilledQuestions(questionsArray)
    End If
    
    If questionCount < 1 Then questionCount = 1

    ' Члены совета
    If membersRaw <> "" Then
        membersRaw = Replace(membersRaw, vbLf, ",")
        membersRaw = Replace(membersRaw, vbCrLf, ",")
        membersRaw = Replace(membersRaw, ";", ",")
        membersArray = Split(membersRaw, ",")
    Else
        ReDim membersArray(0 To 0)
    End If

    ' ========================================
    ' 3. ЗАПУСК WORD
    ' ========================================
    On Error Resume Next
    Set wdApp = GetObject(, "Word.Application")
    If Err.Number <> 0 Then Set wdApp = CreateObject("Word.Application")
    Err.Clear
    On Error GoTo ErrorHandler
    
    wdApp.Visible = False
    wdApp.DisplayAlerts = 0

    ' ========================================
    ' 4. ГЕНЕРАЦИЯ БЮЛЛЕТЕНЕЙ
    ' ========================================
    If UBound(membersArray) >= 0 Then
        For j = 0 To UBound(membersArray)
            memberFIO = Trim(membersArray(j))
            If memberFIO <> "" Then
                Set wdDoc = wdApp.Documents.Open(folderPath & "Biulleten_template.docx", ReadOnly:=True)
                
                Call ReplaceAllFields(wdDoc, companyFull, companyShort, ogrn, dateMeeting, place, chairman, secretary, secretaryInstr)
                
                ' --- ЗАПОЛНЕНИЕ ДАННЫХ ЧЛЕНА СОВЕТА ---
                Call ReplaceInAllStories(wdDoc, "MemberFIO", memberFIO)
                Call ReplaceInAllStories(wdDoc, "Members", memberFIO)
                Call ReplaceInAllStories(wdDoc, "fioSD", memberFIO)
                
                ' --- ШАГ 1: Удаляем лишние блоки ---
                For q = 10 To questionCount + 1 Step -1
                    Call DeleteBlockByMarkers(wdDoc, q)
                Next q
                
                ' --- ШАГ 2: Заполняем нужные и чистим метки ---
                For q = 1 To questionCount
                    Call ReplaceInAllStories(wdDoc, "Question" & q, questionsArray(q - 1))
                    ' ИСПРАВЛЕНИЕ: убираем начальную нумерацию из формулировки
                    Call ReplaceInAllStories(wdDoc, "Formulation" & q, StripLeadingNumber(formulationsArray(q - 1)))
                    
                    Call ReplaceInAllStories(wdDoc, "Start" & q, "")
                    Call ReplaceInAllStories(wdDoc, "End" & q, "")
                Next q
                
                Call CleanDoc(wdDoc)
                
                savePath = folderPath & "Бюллетень_" & CleanName(memberFIO) & ".docx"
                If SafeFileDelete(fso, savePath) Then
                    wdDoc.SaveAs2 savePath
                    bulletinCount = bulletinCount + 1
                End If
                wdDoc.Close False
            End If
        Next j
    End If

    ' ========================================
    ' 5. ГЕНЕРАЦИЯ ПРОТОКОЛА
    ' ========================================
    Set wdDoc = wdApp.Documents.Open(folderPath & "Protokol_template.docx", ReadOnly:=True)
    
    Call ReplaceAllFields(wdDoc, companyFull, companyShort, ogrn, dateMeeting, place, chairman, secretary, secretaryInstr)
    Call ReplaceInAllStories(wdDoc, "Number", protocolNumber)
    Call ReplaceInAllStories(wdDoc, "VotesFor", votesFor)
    Call ReplaceInAllStories(wdDoc, "VotesAgainst", votesAgainst)
    Call ReplaceInAllStories(wdDoc, "VotesAbstained", votesAbstained)
    Call ReplaceInAllStories(wdDoc, "FIOVotesFor", fioVotesFor)
    
    membersList = ""
    For j = 0 To UBound(membersArray)
        If Trim(membersArray(j)) <> "" Then membersList = membersList & Trim(membersArray(j)) & ", "
    Next j
    If Len(membersList) > 2 Then membersList = Left(membersList, Len(membersList) - 2)
    Call ReplaceInAllStories(wdDoc, "Members", membersList)
    
    ' --- ШАГ 1: УДАЛЕНИЕ ЛИШНИХ БЛОКОВ И ТЕГОВ ПОВЕСТКИ ---
    For q = 10 To questionCount + 1 Step -1
        Call DeleteBlockByMarkers(wdDoc, q)
        Call ReplaceInAllStories(wdDoc, "Question" & q, "")
        Call ReplaceInAllStories(wdDoc, "Formulation" & q, "")
    Next q
    
    ' --- ШАГ 2: ЗАПОЛНЕНИЕ ОСТАВШИХСЯ ---
    For q = 1 To questionCount
        Call ReplaceInAllStories(wdDoc, "Question" & q, questionsArray(q - 1))
        ' ИСПРАВЛЕНИЕ: убираем начальную нумерацию из формулировки решения
        Call ReplaceInAllStories(wdDoc, "Formulation" & q, StripLeadingNumber(formulationsArray(q - 1)))
        
        Call ReplaceInAllStories(wdDoc, "Start" & q, "")
        Call ReplaceInAllStories(wdDoc, "End" & q, "")
    Next q
    
    Call CleanDoc(wdDoc)
    
    savePath = folderPath & "Протокол_" & CleanName(protocolNumber) & ".docx"
    If SafeFileDelete(fso, savePath) Then
        wdDoc.SaveAs2 savePath
        protocolCount = 1
    End If
    wdDoc.Close False
    
    ' ========================================
    ' 6. ГЕНЕРАЦИЯ РЕШЕНИЯ
    ' ========================================
    Set wdDoc = wdApp.Documents.Open(folderPath & "Reshenie_template.docx", ReadOnly:=True)
    
    Call ReplaceAllFields(wdDoc, companyFull, companyShort, ogrn, dateMeeting, place, chairman, secretary, secretaryInstr)
    Call ReplaceInAllStories(wdDoc, "Members", membersList)
    Call ReplaceInAllStories(wdDoc, "DateOfRequest", dateOfRequest)
    
    For q = 1 To 10
        If q <= questionCount Then
            Call ReplaceInAllStories(wdDoc, "Question" & q, questionsArray(q - 1))
            ' ИСПРАВЛЕНИЕ: добавлена замена <<Formulation>> в Решении
            ' (ранее этот тег не обрабатывался, и в документе вместо
            '  принятого решения отображался текст вопроса).
            ' Также убираем начальную нумерацию из формулировки.
            Call ReplaceInAllStories(wdDoc, "Formulation" & q, StripLeadingNumber(formulationsArray(q - 1)))
            Call ReplaceInAllStories(wdDoc, "Start" & q, "")
            Call ReplaceInAllStories(wdDoc, "End" & q, "")
        Else
            Call ReplaceInAllStories(wdDoc, "Question" & q, "")
            Call ReplaceInAllStories(wdDoc, "Formulation" & q, "")
            Call DeleteBlockByMarkers(wdDoc, q)
        End If
    Next q
    
    Call CleanDoc(wdDoc)
    
    savePath = folderPath & "Решение.docx"
    If SafeFileDelete(fso, savePath) Then
        wdDoc.SaveAs2 savePath
        reshenieCount = 1
    End If
    wdDoc.Close False
    
    ' ========================================
    ' ЗАВЕРШЕНИЕ
    ' ========================================
    wdApp.DisplayAlerts = -1
    wdApp.Quit
    Set wdApp = Nothing
    
    MsgBox "Готово!" & vbCrLf & _
           "Обработано вопросов: " & questionCount & vbCrLf & _
           "Документы созданы.", vbInformation
    Exit Sub

ErrorHandler:
    MsgBox "Ошибка: " & Err.Description & " (" & Err.Number & ")", vbCritical
    
    ' Безопасное закрытие при ошибке
    On Error Resume Next
    If Not wdApp Is Nothing Then
        wdApp.DisplayAlerts = -1
        wdApp.Quit
        Set wdApp = Nothing
    End If
End Sub

' ==========================================================
' ФУНКЦИИ
' ==========================================================

' ИСПРАВЛЕНИЕ: Полностью переписана функция замены тегов.
' - Убрано ограничение в 250 символов.
' - Для коротких текстов (до 250 символов) используется
'   стандартный Find/Replace (быстрее).
' - Для длинных текстов используется прямая замена через
'   Range.Text, что обходит лимит Word в 255 символов
'   для Find.Replacement.Text.
Sub ReplaceInAllStories(doc As Object, tag As String, val As String)
    Dim rng As Object
    Dim storyRng As Object
    Dim fText As String
    fText = "<<" & tag & ">>"
    
    ' --- КОРОТКИЙ ТЕКСТ: стандартный Find/Replace ---
    If Len(val) <= 250 Then
        For Each storyRng In doc.StoryRanges
            Set rng = storyRng
            Do
                With rng.Find
                    .ClearFormatting
                    .Replacement.ClearFormatting
                    .Text = fText
                    .Replacement.Text = val
                    .Forward = True
                    .Wrap = 1 ' wdFindContinue
                    .Format = False
                    .MatchWildcards = False
                    .Execute Replace:=2 ' wdReplaceAll
                End With
                Set rng = rng.NextStoryRange
            Loop While Not rng Is Nothing
        Next
    Else
        ' --- ДЛИННЫЙ ТЕКСТ: прямая замена через Range.Text ---
        ' Обходим ограничение Word в 255 символов для Replacement.Text
        For Each storyRng In doc.StoryRanges
            Set rng = storyRng
            Do
                Do
                    rng.Find.ClearFormatting
                    rng.Find.Text = fText
                    rng.Find.Forward = True
                    rng.Find.Wrap = 0 ' wdFindStop
                    rng.Find.Format = False
                    rng.Find.MatchWildcards = False
                    
                    If Not rng.Find.Execute Then Exit Do
                    
                    ' Найден тег — заменяем текст напрямую
                    rng.Text = val
                    ' Сдвигаем диапазон за вставленный текст
                    rng.Collapse 0 ' wdCollapseEnd
                Loop
                Set rng = rng.NextStoryRange
            Loop While Not rng Is Nothing
        Next
    End If
End Sub

Sub ReplaceAllFields(doc As Object, _
                     ByVal cFull As String, _
                     ByVal cShort As String, _
                     ByVal ogrn As String, _
                     ByVal dMeet As String, _
                     ByVal place As String, _
                     ByVal chair As String, _
                     ByVal sec As String, _
                     ByVal secInstr As String)
    
    ' 1. Генерируем название в родительном падеже
    Dim cGenitive As String
    cGenitive = GetGenitiveName(cFull)
    
    Call ReplaceInAllStories(doc, "Company", cFull)
    Call ReplaceInAllStories(doc, "Сompany", cFull)
    
    ' 2. Вставляем CompanyP (Родительный падеж)
    Call ReplaceInAllStories(doc, "CompanyP", cGenitive)
    Call ReplaceInAllStories(doc, "CompanyР", cGenitive) ' Русская Р
    
    Call ReplaceInAllStories(doc, "ShortName", cShort)
    Call ReplaceInAllStories(doc, "CompanyShort", cShort)
    Call ReplaceInAllStories(doc, "NamewithoutOOO", cShort)
    
    Call ReplaceInAllStories(doc, "OGRN", ogrn)
    Call ReplaceInAllStories(doc, "DateMeeting", dMeet)
    Call ReplaceInAllStories(doc, "Place", place)
    Call ReplaceInAllStories(doc, "Chairman", chair)
    Call ReplaceInAllStories(doc, "Secretary", sec)
    Call ReplaceInAllStories(doc, "SecretaryInstrumental", secInstr)
End Sub

Function GetVal(ws As Worksheet, findTxt As String) As String
    Dim i As Long, cellVal As String
    For i = 1 To 100
        cellVal = Trim(CStr(ws.Cells(i, 1).Value))
        If InStr(1, cellVal, findTxt, vbTextCompare) > 0 Then
            GetVal = Trim(CStr(ws.Cells(i, 2).Value))
            Exit Function
        End If
    Next i
    GetVal = ""
End Function

Sub ReadAllQuestionsData(ws As Worksheet, ByRef qArr() As String, ByRef fArr() As String)
    Dim i As Integer, r As Long
    Dim tQ As String, tF As String
    Dim cellVal As String
    
    For i = 1 To 10
        tQ = "": tF = ""
        For r = 1 To 100
            cellVal = LCase(Trim(CStr(ws.Cells(r, 1).Value)))
            If cellVal Like "*вопрос*повестки*" & i & "*" Or cellVal Like "*вопрос*повестки*" & i Then
                tQ = Trim(CStr(ws.Cells(r, 2).Value))
            ElseIf cellVal Like "*вопрос*" & i & "*" And Not (cellVal Like "*решения*") And Not (cellVal Like "*количество*") Then
                 If tQ = "" Then tQ = Trim(CStr(ws.Cells(r, 2).Value))
            End If
            If cellVal Like "*формулировка*решения*" & i & "*" Or cellVal Like "*формулировка*решения*" & i Then
                tF = Trim(CStr(ws.Cells(r, 2).Value))
            End If
        Next r
        qArr(i - 1) = tQ
        fArr(i - 1) = tF
    Next i
End Sub

Function CountFilledQuestions(qArr() As String) As Integer
    Dim i As Integer, cnt As Integer
    cnt = 0
    For i = 0 To 9
        If qArr(i) <> "" Then cnt = cnt + 1
    Next i
    CountFilledQuestions = cnt
End Function

Sub DeleteBlockByMarkers(doc As Object, qNum As Integer)
    Dim rngStart As Object, rngEnd As Object
    Dim sTag As String, eTag As String
    
    sTag = "<<Start" & qNum & ">>"
    eTag = "<<End" & qNum & ">>"
    
    Set rngStart = doc.Content
    With rngStart.Find
        .Text = sTag
        .Forward = True
        .Wrap = 0
        .Execute
    End With
    
    Set rngEnd = doc.Content
    With rngEnd.Find
        .Text = eTag
        .Forward = True
        .Wrap = 0
        .Execute
    End With
    
    If rngStart.Find.Found And rngEnd.Find.Found Then
        Dim rangeToDelete As Object
        Set rangeToDelete = doc.Range(rngStart.Start, rngEnd.End)
        rangeToDelete.MoveEnd 4, 1
        rangeToDelete.Delete
    Else
        Call ReplaceInAllStories(doc, "Question" & qNum, "")
        Call ReplaceInAllStories(doc, "Formulation" & qNum, "")
    End If
End Sub

Function SafeFileDelete(fso As Object, filePath As String) As Boolean
    On Error Resume Next
    If fso.FileExists(filePath) Then
        fso.DeleteFile filePath, True
        If Err.Number <> 0 Then
            MsgBox "Закройте файл Word: " & vbCrLf & filePath, vbExclamation
            SafeFileDelete = False
            Exit Function
        End If
    End If
    SafeFileDelete = True
End Function

Function CleanName(s As String) As String
    Dim bad As String, i As Integer
    bad = "\/:*?<>|"""
    For i = 1 To Len(bad)
        s = Replace(s, Mid(bad, i, 1), "_")
    Next i
    CleanName = Trim(s)
End Function

Sub CleanDoc(doc As Object)
    Dim i As Integer
    For i = 1 To 10
        With doc.Content.Find
            .Text = "^p^p^p"
            .Replacement.Text = "^p^p"
            .Forward = True
            .Wrap = 1
            .Format = False
            .MatchWildcards = False
            .Execute Replace:=2
        End With
    Next i
End Sub

Function GetInstrumentalCase(fio As String) As String
    Dim parts() As String, surname As String, initials As String
    Dim last1 As String, last2 As String
    If fio = "" Then GetInstrumentalCase = "": Exit Function
    parts = Split(fio, " ")
    surname = parts(0)
    If UBound(parts) > 0 Then initials = Right(fio, Len(fio) - Len(surname))
    last1 = Right(surname, 1): last2 = Right(surname, 2)
    If last2 = "ов" Or last2 = "ев" Or last2 = "ин" Or last2 = "ын" Then
        surname = surname & "ым"
    ElseIf last2 = "ая" Then
        surname = Left(surname, Len(surname) - 2) & "ой"
    ElseIf last1 = "а" Then
        surname = Left(surname, Len(surname) - 1) & "ой"
    ElseIf last1 = "я" Then
        surname = Left(surname, Len(surname) - 1) & "ей"
    ElseIf last2 = "ий" Or last2 = "ый" Then
        surname = Left(surname, Len(surname) - 2) & "им"
    End If
    GetInstrumentalCase = surname & initials
End Function

' === ФУНКЦИЯ ДЛЯ РОДИТЕЛЬНОГО ПАДЕЖА ===
Function GetGenitiveName(s As String) As String
    Dim res As String
    res = Trim(s)
    
    If InStr(1, res, "Общество с", vbTextCompare) = 1 Then
        res = "Общества" & Mid(res, 9)
        
    ElseIf InStr(1, res, "Акционерное общество", vbTextCompare) = 1 Then
        res = "Акционерного общества" & Mid(res, 21)
        
    ElseIf InStr(1, res, "Публичное акционерное общество", vbTextCompare) = 1 Then
        res = "Публичного акционерного общества" & Mid(res, 31)
    End If
    
    GetGenitiveName = res
End Function

' === НОВАЯ ФУНКЦИЯ: удаление начальной нумерации из текста ===
' Убирает ведущую нумерацию вида "1. ", "2. ", "10. " и т.д.
' из текста формулировки решения, чтобы в документе
' перед «Руководствуясь» не стояла цифра.
Function StripLeadingNumber(s As String) As String
    Dim result As String
    Dim dotPos As Long
    Dim prefix As String
    Dim i As Long
    Dim allDigits As Boolean
    
    result = Trim(s)
    
    If Len(result) = 0 Then
        StripLeadingNumber = ""
        Exit Function
    End If
    
    ' Ищем первую точку с пробелом
    dotPos = InStr(result, ". ")
    
    ' Проверяем, что перед точкой стоят только цифры (1-3 цифры)
    If dotPos >= 2 And dotPos <= 4 Then
        prefix = Left(result, dotPos - 1)
        allDigits = True
        For i = 1 To Len(prefix)
            If Not IsNumeric(Mid(prefix, i, 1)) Then
                allDigits = False
                Exit For
            End If
        Next i
        
        If allDigits Then
            ' Убираем "N. " с начала строки
            result = Trim(Mid(result, dotPos + 2))
        End If
    End If
    
    StripLeadingNumber = result
End Function
