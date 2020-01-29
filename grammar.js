module.exports = grammar({
  name: "KotlinParser_converted",
  extras: $ => [],
  rules: {
    kotlinFile: $ => seq(
      optional($.shebangLine),
      repeat($.NL),
      repeat($.fileAnnotation),
      $.packageHeader_arb,
      $.importList_elem,
      repeat($.topLevelObject),
      $.EOF
    ),

    script: $ => seq(
      optional($.shebangLine),
      repeat($.NL),
      repeat($.fileAnnotation),
      $.packageHeader_arb,
      $.importList_elem,
      repeat(seq(
        $.statement,
        $.semi
      )),
      $.EOF
    ),

    shebangLine: $ => seq(
      $.ShebangLine,
      repeat1($.NL)
    ),

    fileAnnotation: $ => seq(
      choice(
        $.AT_NO_WS,
        $.AT_PRE_WS
      ),
      $.FILE,
      repeat($.NL),
      $.COLON,
      repeat($.NL),
      choice(
        seq(
          $.LSQUARE,
          repeat1($.unescapedAnnotation),
          $.RSQUARE
        ),
        $.unescapedAnnotation
      ),
      repeat($.NL)
    ),

    packageHeader_arb: $ => seq(
      $.PACKAGE,
      $.identifier,
      optional($.semi)
    ),

    importList_elem: $ => $.importHeader,

    importHeader: $ => seq(
      $.IMPORT,
      $.identifier,
      optional(choice(
        seq(
          $.DOT,
          $.MULT
        ),
        $.importAlias
      )),
      optional($.semi)
    ),

    importAlias: $ => seq(
      $.AS,
      $.simpleIdentifier
    ),

    topLevelObject: $ => seq(
      $.declaration,
      optional($.semis)
    ),

    typeAlias: $ => seq(
      optional($.modifiers),
      $.TYPE_ALIAS,
      repeat($.NL),
      $.simpleIdentifier,
      optional(seq(
        repeat($.NL),
        $.typeParameters
      )),
      repeat($.NL),
      $.ASSIGNMENT,
      repeat($.NL),
      $.type
    ),

    declaration: $ => choice(
      $.classDeclaration,
      $.objectDeclaration,
      $.functionDeclaration,
      $.propertyDeclaration,
      $.typeAlias
    ),

    classDeclaration: $ => seq(
      optional($.modifiers),
      choice(
        $.CLASS,
        $.INTERFACE
      ),
      repeat($.NL),
      $.simpleIdentifier,
      optional(seq(
        repeat($.NL),
        $.typeParameters
      )),
      optional(seq(
        repeat($.NL),
        $.primaryConstructor
      )),
      optional(seq(
        repeat($.NL),
        $.COLON,
        repeat($.NL),
        $.delegationSpecifiers
      )),
      optional(seq(
        repeat($.NL),
        $.typeConstraints
      )),
      optional(choice(
        seq(
          repeat($.NL),
          $.classBody
        ),
        seq(
          repeat($.NL),
          $.enumClassBody
        )
      ))
    ),

    primaryConstructor: $ => seq(
      optional(seq(
        optional($.modifiers),
        $.CONSTRUCTOR,
        repeat($.NL)
      )),
      $.classParameters
    ),

    classBody: $ => seq(
      $.LCURL,
      repeat($.NL),
      $.classMemberDeclarations_elem,
      repeat($.NL),
      $.RCURL
    ),

    classParameters: $ => seq(
      $.LPAREN,
      repeat($.NL),
      optional(seq(
        $.classParameter,
        repeat(seq(
          repeat($.NL),
          $.COMMA,
          repeat($.NL),
          $.classParameter
        ))
      )),
      repeat($.NL),
      $.RPAREN
    ),

    classParameter: $ => seq(
      optional($.modifiers),
      optional(choice(
        $.VAL,
        $.VAR
      )),
      repeat($.NL),
      $.simpleIdentifier,
      $.COLON,
      repeat($.NL),
      $.type,
      optional(seq(
        repeat($.NL),
        $.ASSIGNMENT,
        repeat($.NL),
        $.expression
      ))
    ),

    delegationSpecifiers: $ => seq(
      $.annotatedDelegationSpecifier,
      repeat(seq(
        repeat($.NL),
        $.COMMA,
        repeat($.NL),
        $.annotatedDelegationSpecifier
      ))
    ),

    delegationSpecifier: $ => choice(
      $.constructorInvocation,
      $.explicitDelegation,
      $.userType,
      $.functionType
    ),

    constructorInvocation: $ => seq(
      $.userType,
      $.valueArguments
    ),

    annotatedDelegationSpecifier: $ => seq(
      repeat($.annotation),
      repeat($.NL),
      $.delegationSpecifier
    ),

    explicitDelegation: $ => seq(
      choice(
        $.userType,
        $.functionType
      ),
      repeat($.NL),
      $.BY,
      repeat($.NL),
      $.expression
    ),

    typeParameters: $ => seq(
      $.LANGLE,
      repeat($.NL),
      $.typeParameter,
      repeat(seq(
        repeat($.NL),
        $.COMMA,
        repeat($.NL),
        $.typeParameter
      )),
      repeat($.NL),
      $.RANGLE
    ),

    typeParameter: $ => seq(
      optional($.typeParameterModifiers),
      repeat($.NL),
      $.simpleIdentifier,
      optional(seq(
        repeat($.NL),
        $.COLON,
        repeat($.NL),
        $.type
      ))
    ),

    typeConstraints: $ => seq(
      $.WHERE,
      repeat($.NL),
      $.typeConstraint,
      repeat(seq(
        repeat($.NL),
        $.COMMA,
        repeat($.NL),
        $.typeConstraint
      ))
    ),

    typeConstraint: $ => seq(
      repeat($.annotation),
      $.simpleIdentifier,
      repeat($.NL),
      $.COLON,
      repeat($.NL),
      $.type
    ),

    classMemberDeclarations_elem: $ => seq(
      $.classMemberDeclaration,
      optional($.semis)
    ),

    classMemberDeclaration: $ => choice(
      $.declaration,
      $.companionObject,
      $.anonymousInitializer,
      $.secondaryConstructor
    ),

    anonymousInitializer: $ => seq(
      $.INIT,
      repeat($.NL),
      $.block
    ),

    companionObject: $ => seq(
      optional($.modifiers),
      $.COMPANION,
      repeat($.NL),
      $.OBJECT,
      optional(seq(
        repeat($.NL),
        $.simpleIdentifier
      )),
      optional(seq(
        repeat($.NL),
        $.COLON,
        repeat($.NL),
        $.delegationSpecifiers
      )),
      optional(seq(
        repeat($.NL),
        $.classBody
      ))
    ),

    functionValueParameters: $ => seq(
      $.LPAREN,
      repeat($.NL),
      optional(seq(
        $.functionValueParameter,
        repeat(seq(
          repeat($.NL),
          $.COMMA,
          repeat($.NL),
          $.functionValueParameter
        ))
      )),
      repeat($.NL),
      $.RPAREN
    ),

    functionValueParameter: $ => seq(
      optional($.parameterModifiers),
      $.parameter,
      optional(seq(
        repeat($.NL),
        $.ASSIGNMENT,
        repeat($.NL),
        $.expression
      ))
    ),

    functionDeclaration: $ => seq(
      optional($.modifiers),
      $.FUN,
      optional(seq(
        repeat($.NL),
        $.typeParameters
      )),
      optional(seq(
        repeat($.NL),
        $.receiverType,
        repeat($.NL),
        $.DOT
      )),
      repeat($.NL),
      $.simpleIdentifier,
      repeat($.NL),
      $.functionValueParameters,
      optional(seq(
        repeat($.NL),
        $.COLON,
        repeat($.NL),
        $.type
      )),
      optional(seq(
        repeat($.NL),
        $.typeConstraints
      )),
      optional(seq(
        repeat($.NL),
        $.functionBody
      ))
    ),

    functionBody: $ => choice(
      $.block,
      seq(
        $.ASSIGNMENT,
        repeat($.NL),
        $.expression
      )
    ),

    variableDeclaration: $ => seq(
      repeat($.annotation),
      repeat($.NL),
      $.simpleIdentifier,
      optional(seq(
        repeat($.NL),
        $.COLON,
        repeat($.NL),
        $.type
      ))
    ),

    multiVariableDeclaration: $ => seq(
      $.LPAREN,
      repeat($.NL),
      $.variableDeclaration,
      repeat(seq(
        repeat($.NL),
        $.COMMA,
        repeat($.NL),
        $.variableDeclaration
      )),
      repeat($.NL),
      $.RPAREN
    ),

    propertyDeclaration: $ => seq(
      optional($.modifiers),
      choice(
        $.VAL,
        $.VAR
      ),
      optional(seq(
        repeat($.NL),
        $.typeParameters
      )),
      optional(seq(
        repeat($.NL),
        $.receiverType,
        repeat($.NL),
        $.DOT
      )),
      seq(
        repeat($.NL),
        choice(
          $.multiVariableDeclaration,
          $.variableDeclaration
        )
      ),
      optional(seq(
        repeat($.NL),
        $.typeConstraints
      )),
      optional(seq(
        repeat($.NL),
        choice(
          seq(
            $.ASSIGNMENT,
            repeat($.NL),
            $.expression
          ),
          $.propertyDelegate
        )
      )),
      optional(seq(
        repeat1($.NL),
        $.SEMICOLON
      )),
      repeat($.NL),
      choice(
        seq(
          optional($.getter),
          optional(seq(
            repeat($.NL),
            optional($.semi),
            $.setter
          ))
        ),
        seq(
          optional($.setter),
          optional(seq(
            repeat($.NL),
            optional($.semi),
            $.getter
          ))
        )
      )
    ),

    propertyDelegate: $ => seq(
      $.BY,
      repeat($.NL),
      $.expression
    ),

    getter: $ => choice(
      seq(
        optional($.modifiers),
        $.GET
      ),
      seq(
        optional($.modifiers),
        $.GET,
        repeat($.NL),
        $.LPAREN,
        repeat($.NL),
        $.RPAREN,
        optional(seq(
          repeat($.NL),
          $.COLON,
          repeat($.NL),
          $.type
        )),
        repeat($.NL),
        $.functionBody
      )
    ),

    setter: $ => choice(
      seq(
        optional($.modifiers),
        $.SET
      ),
      seq(
        optional($.modifiers),
        $.SET,
        repeat($.NL),
        $.LPAREN,
        repeat($.NL),
        $.parameterWithOptionalType,
        repeat($.NL),
        $.RPAREN,
        optional(seq(
          repeat($.NL),
          $.COLON,
          repeat($.NL),
          $.type
        )),
        repeat($.NL),
        $.functionBody
      )
    ),

    parametersWithOptionalType: $ => seq(
      $.LPAREN,
      repeat($.NL),
      optional(seq(
        $.parameterWithOptionalType,
        repeat(seq(
          repeat($.NL),
          $.COMMA,
          repeat($.NL),
          $.parameterWithOptionalType
        ))
      )),
      repeat($.NL),
      $.RPAREN
    ),

    parameterWithOptionalType: $ => seq(
      optional($.parameterModifiers),
      $.simpleIdentifier,
      repeat($.NL),
      optional(seq(
        $.COLON,
        repeat($.NL),
        $.type
      ))
    ),

    parameter: $ => seq(
      $.simpleIdentifier,
      repeat($.NL),
      $.COLON,
      repeat($.NL),
      $.type
    ),

    objectDeclaration: $ => seq(
      optional($.modifiers),
      $.OBJECT,
      repeat($.NL),
      $.simpleIdentifier,
      optional(seq(
        repeat($.NL),
        $.COLON,
        repeat($.NL),
        $.delegationSpecifiers
      )),
      optional(seq(
        repeat($.NL),
        $.classBody
      ))
    ),

    secondaryConstructor: $ => seq(
      optional($.modifiers),
      $.CONSTRUCTOR,
      repeat($.NL),
      $.functionValueParameters,
      optional(seq(
        repeat($.NL),
        $.COLON,
        repeat($.NL),
        $.constructorDelegationCall
      )),
      repeat($.NL),
      optional($.block)
    ),

    constructorDelegationCall: $ => choice(
      seq(
        $.THIS,
        repeat($.NL),
        $.valueArguments
      ),
      seq(
        $.SUPER,
        repeat($.NL),
        $.valueArguments
      )
    ),

    enumClassBody: $ => seq(
      $.LCURL,
      repeat($.NL),
      optional($.enumEntries),
      optional(seq(
        repeat($.NL),
        $.SEMICOLON,
        repeat($.NL),
        $.classMemberDeclarations_elem
      )),
      repeat($.NL),
      $.RCURL
    ),

    enumEntries: $ => seq(
      $.enumEntry,
      repeat(seq(
        repeat($.NL),
        $.COMMA,
        repeat($.NL),
        $.enumEntry
      )),
      repeat($.NL),
      optional($.COMMA)
    ),

    enumEntry: $ => seq(
      optional(seq(
        $.modifiers,
        repeat($.NL)
      )),
      $.simpleIdentifier,
      optional(seq(
        repeat($.NL),
        $.valueArguments
      )),
      optional(seq(
        repeat($.NL),
        $.classBody
      ))
    ),

    type: $ => seq(
      optional($.typeModifiers),
      choice(
        $.parenthesizedType,
        $.nullableType,
        $.typeReference,
        $.functionType
      )
    ),

    typeReference: $ => choice(
      $.userType,
      $.DYNAMIC
    ),

    nullableType: $ => seq(
      choice(
        $.typeReference,
        $.parenthesizedType
      ),
      repeat($.NL),
      repeat1($.quest)
    ),

    quest: $ => choice(
      $.QUEST_NO_WS,
      $.QUEST_WS
    ),

    userType: $ => seq(
      $.simpleUserType,
      repeat(seq(
        repeat($.NL),
        $.DOT,
        repeat($.NL),
        $.simpleUserType
      ))
    ),

    simpleUserType: $ => seq(
      $.simpleIdentifier,
      optional(seq(
        repeat($.NL),
        $.typeArguments
      ))
    ),

    typeProjection: $ => choice(
      seq(
        optional($.typeProjectionModifiers),
        $.type
      ),
      $.MULT
    ),

    typeProjectionModifiers: $ => repeat1($.typeProjectionModifier),

    typeProjectionModifier: $ => choice(
      seq(
        $.varianceModifier,
        repeat($.NL)
      ),
      $.annotation
    ),

    functionType: $ => seq(
      optional(seq(
        $.receiverType,
        repeat($.NL),
        $.DOT,
        repeat($.NL)
      )),
      $.functionTypeParameters,
      repeat($.NL),
      $.ARROW,
      repeat($.NL),
      $.type
    ),

    functionTypeParameters: $ => seq(
      $.LPAREN,
      repeat($.NL),
      optional(choice(
        $.parameter,
        $.type
      )),
      repeat(seq(
        repeat($.NL),
        $.COMMA,
        repeat($.NL),
        choice(
          $.parameter,
          $.type
        )
      )),
      repeat($.NL),
      $.RPAREN
    ),

    parenthesizedType: $ => seq(
      $.LPAREN,
      repeat($.NL),
      $.type,
      repeat($.NL),
      $.RPAREN
    ),

    receiverType: $ => seq(
      optional($.typeModifiers),
      choice(
        $.parenthesizedType,
        $.nullableType,
        $.typeReference
      )
    ),

    parenthesizedUserType: $ => choice(
      seq(
        $.LPAREN,
        repeat($.NL),
        $.userType,
        repeat($.NL),
        $.RPAREN
      ),
      seq(
        $.LPAREN,
        repeat($.NL),
        $.parenthesizedUserType,
        repeat($.NL),
        $.RPAREN
      )
    ),

    statements_arb: $ => seq(
      $.statement,
      repeat(seq(
        $.semis,
        $.statement
      )),
      optional($.semis)
    ),

    statement: $ => seq(
      repeat(choice(
        $.label,
        $.annotation
      )),
      choice(
        $.declaration,
        $.assignment,
        $.loopStatement,
        $.expression
      )
    ),

    label: $ => seq(
      $.simpleIdentifier,
      choice(
        $.AT_NO_WS,
        $.AT_POST_WS
      ),
      repeat($.NL)
    ),

    controlStructureBody: $ => choice(
      $.block,
      $.statement
    ),

    block: $ => seq(
      $.LCURL,
      repeat($.NL),
      $.statements_arb,
      repeat($.NL),
      $.RCURL
    ),

    loopStatement: $ => choice(
      $.forStatement,
      $.whileStatement,
      $.doWhileStatement
    ),

    forStatement: $ => seq(
      $.FOR,
      repeat($.NL),
      $.LPAREN,
      repeat($.annotation),
      choice(
        $.variableDeclaration,
        $.multiVariableDeclaration
      ),
      $.IN,
      $.expression,
      $.RPAREN,
      repeat($.NL),
      optional($.controlStructureBody)
    ),

    whileStatement: $ => choice(
      seq(
        $.WHILE,
        repeat($.NL),
        $.LPAREN,
        $.expression,
        $.RPAREN,
        repeat($.NL),
        $.controlStructureBody
      ),
      seq(
        $.WHILE,
        repeat($.NL),
        $.LPAREN,
        $.expression,
        $.RPAREN,
        repeat($.NL),
        $.SEMICOLON
      )
    ),

    doWhileStatement: $ => seq(
      $.DO,
      repeat($.NL),
      optional($.controlStructureBody),
      repeat($.NL),
      $.WHILE,
      repeat($.NL),
      $.LPAREN,
      $.expression,
      $.RPAREN
    ),

    assignment: $ => choice(
      seq(
        $.directlyAssignableExpression,
        $.ASSIGNMENT,
        repeat($.NL),
        $.expression
      ),
      seq(
        $.assignableExpression,
        $.assignmentAndOperator,
        repeat($.NL),
        $.expression
      )
    ),

    semi: $ => choice(
      seq(
        choice(
          $.SEMICOLON,
          $.NL
        ),
        repeat($.NL)
      ),
      $.EOF
    ),

    semis: $ => choice(
      repeat1(choice(
        $.SEMICOLON,
        $.NL
      )),
      $.EOF
    ),

    expression: $ => $.disjunction,

    disjunction: $ => seq(
      $.conjunction,
      repeat(seq(
        repeat($.NL),
        $.DISJ,
        repeat($.NL),
        $.conjunction
      ))
    ),

    conjunction: $ => seq(
      $.equality,
      repeat(seq(
        repeat($.NL),
        $.CONJ,
        repeat($.NL),
        $.equality
      ))
    ),

    equality: $ => seq(
      $.comparison,
      repeat(seq(
        $.equalityOperator,
        repeat($.NL),
        $.comparison
      ))
    ),

    comparison: $ => seq(
      $.infixOperation,
      optional(seq(
        $.comparisonOperator,
        repeat($.NL),
        $.infixOperation
      ))
    ),

    infixOperation: $ => seq(
      $.elvisExpression,
      repeat(choice(
        seq(
          $.inOperator,
          repeat($.NL),
          $.elvisExpression
        ),
        seq(
          $.isOperator,
          repeat($.NL),
          $.type
        )
      ))
    ),

    elvisExpression: $ => seq(
      $.infixFunctionCall,
      repeat(seq(
        repeat($.NL),
        $.elvis,
        repeat($.NL),
        $.infixFunctionCall
      ))
    ),

    elvis: $ => seq(
      $.QUEST_NO_WS,
      $.COLON
    ),

    infixFunctionCall: $ => seq(
      $.rangeExpression,
      repeat(seq(
        $.simpleIdentifier,
        repeat($.NL),
        $.rangeExpression
      ))
    ),

    rangeExpression: $ => seq(
      $.additiveExpression,
      repeat(seq(
        $.RANGE,
        repeat($.NL),
        $.additiveExpression
      ))
    ),

    additiveExpression: $ => seq(
      $.multiplicativeExpression,
      repeat(seq(
        $.additiveOperator,
        repeat($.NL),
        $.multiplicativeExpression
      ))
    ),

    multiplicativeExpression: $ => seq(
      $.asExpression,
      repeat(seq(
        $.multiplicativeOperator,
        repeat($.NL),
        $.asExpression
      ))
    ),

    asExpression: $ => seq(
      $.prefixUnaryExpression,
      optional(seq(
        repeat($.NL),
        $.asOperator,
        repeat($.NL),
        $.type
      ))
    ),

    prefixUnaryExpression: $ => seq(
      repeat($.unaryPrefix),
      $.postfixUnaryExpression
    ),

    unaryPrefix: $ => choice(
      $.annotation,
      $.label,
      seq(
        $.prefixUnaryOperator,
        repeat($.NL)
      )
    ),

    postfixUnaryExpression: $ => choice(
      $.primaryExpression,
      seq(
        $.primaryExpression,
        repeat1($.postfixUnarySuffix)
      )
    ),

    postfixUnarySuffix: $ => choice(
      $.postfixUnaryOperator,
      $.typeArguments,
      $.callSuffix,
      $.indexingSuffix,
      $.navigationSuffix
    ),

    directlyAssignableExpression: $ => choice(
      seq(
        $.postfixUnaryExpression,
        $.assignableSuffix
      ),
      $.simpleIdentifier,
      $.parenthesizedDirectlyAssignableExpression
    ),

    parenthesizedDirectlyAssignableExpression: $ => seq(
      $.LPAREN,
      repeat($.NL),
      $.directlyAssignableExpression,
      repeat($.NL),
      $.RPAREN
    ),

    assignableExpression: $ => choice(
      $.prefixUnaryExpression,
      $.parenthesizedAssignableExpression
    ),

    parenthesizedAssignableExpression: $ => seq(
      $.LPAREN,
      repeat($.NL),
      $.assignableExpression,
      repeat($.NL),
      $.RPAREN
    ),

    assignableSuffix: $ => choice(
      $.typeArguments,
      $.indexingSuffix,
      $.navigationSuffix
    ),

    indexingSuffix: $ => seq(
      $.LSQUARE,
      repeat($.NL),
      $.expression,
      repeat(seq(
        repeat($.NL),
        $.COMMA,
        repeat($.NL),
        $.expression
      )),
      repeat($.NL),
      $.RSQUARE
    ),

    navigationSuffix: $ => seq(
      repeat($.NL),
      $.memberAccessOperator,
      repeat($.NL),
      choice(
        $.simpleIdentifier,
        $.parenthesizedExpression,
        $.CLASS
      )
    ),

    callSuffix: $ => choice(
      seq(
        optional($.typeArguments),
        optional($.valueArguments),
        $.annotatedLambda
      ),
      seq(
        optional($.typeArguments),
        $.valueArguments
      )
    ),

    annotatedLambda: $ => seq(
      repeat($.annotation),
      optional($.label),
      repeat($.NL),
      $.lambdaLiteral
    ),

    typeArguments: $ => seq(
      $.LANGLE,
      repeat($.NL),
      $.typeProjection,
      repeat(seq(
        repeat($.NL),
        $.COMMA,
        repeat($.NL),
        $.typeProjection
      )),
      repeat($.NL),
      $.RANGLE
    ),

    valueArguments: $ => choice(
      seq(
        $.LPAREN,
        repeat($.NL),
        $.RPAREN
      ),
      seq(
        $.LPAREN,
        repeat($.NL),
        $.valueArgument,
        repeat(seq(
          repeat($.NL),
          $.COMMA,
          repeat($.NL),
          $.valueArgument
        )),
        repeat($.NL),
        $.RPAREN
      )
    ),

    valueArgument: $ => seq(
      optional($.annotation),
      repeat($.NL),
      optional(seq(
        $.simpleIdentifier,
        repeat($.NL),
        $.ASSIGNMENT,
        repeat($.NL)
      )),
      optional($.MULT),
      repeat($.NL),
      $.expression
    ),

    primaryExpression: $ => choice(
      $.parenthesizedExpression,
      $.simpleIdentifier,
      $.literalConstant,
      $.stringLiteral,
      $.callableReference,
      $.functionLiteral,
      $.objectLiteral,
      $.collectionLiteral,
      $.thisExpression,
      $.superExpression,
      $.ifExpression,
      $.whenExpression,
      $.tryExpression,
      $.jumpExpression
    ),

    parenthesizedExpression: $ => seq(
      $.LPAREN,
      repeat($.NL),
      $.expression,
      repeat($.NL),
      $.RPAREN
    ),

    collectionLiteral: $ => choice(
      seq(
        $.LSQUARE,
        repeat($.NL),
        $.expression,
        repeat(seq(
          repeat($.NL),
          $.COMMA,
          repeat($.NL),
          $.expression
        )),
        repeat($.NL),
        $.RSQUARE
      ),
      seq(
        $.LSQUARE,
        repeat($.NL),
        $.RSQUARE
      )
    ),

    literalConstant: $ => choice(
      $.BooleanLiteral,
      $.IntegerLiteral,
      $.HexLiteral,
      $.BinLiteral,
      $.CharacterLiteral,
      $.RealLiteral,
      $.NullLiteral,
      $.LongLiteral,
      $.UnsignedLiteral
    ),

    stringLiteral: $ => choice(
      $.lineStringLiteral,
      $.multiLineStringLiteral
    ),

    lineStringLiteral: $ => seq(
      $.QUOTE_OPEN,
      repeat(choice(
        $.lineStringContent,
        $.lineStringExpression
      )),
      $.QUOTE_CLOSE
    ),

    multiLineStringLiteral: $ => seq(
      $.TRIPLE_QUOTE_OPEN,
      repeat(choice(
        $.multiLineStringContent,
        $.multiLineStringExpression,
        $.MultiLineStringQuote
      )),
      $.TRIPLE_QUOTE_CLOSE
    ),

    lineStringContent: $ => choice(
      $.LineStrText,
      $.LineStrEscapedChar,
      $.LineStrRef
    ),

    lineStringExpression: $ => seq(
      $.LineStrExprStart,
      $.expression,
      $.RCURL
    ),

    multiLineStringContent: $ => choice(
      $.MultiLineStrText,
      $.MultiLineStringQuote,
      $.MultiLineStrRef
    ),

    multiLineStringExpression: $ => seq(
      $.MultiLineStrExprStart,
      repeat($.NL),
      $.expression,
      repeat($.NL),
      $.RCURL
    ),

    lambdaLiteral: $ => choice(
      seq(
        $.LCURL,
        repeat($.NL),
        $.statements_arb,
        repeat($.NL),
        $.RCURL
      ),
      seq(
        $.LCURL,
        repeat($.NL),
        optional($.lambdaParameters),
        repeat($.NL),
        $.ARROW,
        repeat($.NL),
        $.statements_arb,
        repeat($.NL),
        $.RCURL
      )
    ),

    lambdaParameters: $ => seq(
      $.lambdaParameter,
      repeat(seq(
        repeat($.NL),
        $.COMMA,
        repeat($.NL),
        $.lambdaParameter
      ))
    ),

    lambdaParameter: $ => choice(
      $.variableDeclaration,
      seq(
        $.multiVariableDeclaration,
        optional(seq(
          repeat($.NL),
          $.COLON,
          repeat($.NL),
          $.type
        ))
      )
    ),

    anonymousFunction: $ => seq(
      $.FUN,
      optional(seq(
        repeat($.NL),
        $.type,
        repeat($.NL),
        $.DOT
      )),
      repeat($.NL),
      $.parametersWithOptionalType,
      optional(seq(
        repeat($.NL),
        $.COLON,
        repeat($.NL),
        $.type
      )),
      optional(seq(
        repeat($.NL),
        $.typeConstraints
      )),
      optional(seq(
        repeat($.NL),
        $.functionBody
      ))
    ),

    functionLiteral: $ => choice(
      $.lambdaLiteral,
      $.anonymousFunction
    ),

    objectLiteral: $ => choice(
      seq(
        $.OBJECT,
        repeat($.NL),
        $.COLON,
        repeat($.NL),
        $.delegationSpecifiers,
        repeat($.NL),
        $.classBody
      ),
      seq(
        $.OBJECT,
        repeat($.NL),
        $.classBody
      )
    ),

    thisExpression: $ => choice(
      $.THIS,
      $.THIS_AT
    ),

    superExpression: $ => choice(
      seq(
        $.SUPER,
        optional(seq(
          $.LANGLE,
          repeat($.NL),
          $.type,
          repeat($.NL),
          $.RANGLE
        )),
        optional(seq(
          $.AT_NO_WS,
          $.simpleIdentifier
        ))
      ),
      $.SUPER_AT
    ),

    ifExpression: $ => choice(
      seq(
        $.IF,
        repeat($.NL),
        $.LPAREN,
        repeat($.NL),
        $.expression,
        repeat($.NL),
        $.RPAREN,
        repeat($.NL),
        choice(
          $.controlStructureBody,
          $.SEMICOLON
        )
      ),
      seq(
        $.IF,
        repeat($.NL),
        $.LPAREN,
        repeat($.NL),
        $.expression,
        repeat($.NL),
        $.RPAREN,
        repeat($.NL),
        optional($.controlStructureBody),
        repeat($.NL),
        optional($.SEMICOLON),
        repeat($.NL),
        $.ELSE,
        repeat($.NL),
        choice(
          $.controlStructureBody,
          $.SEMICOLON
        )
      )
    ),

    whenSubject: $ => seq(
      $.LPAREN,
      optional(seq(
        repeat($.annotation),
        repeat($.NL),
        $.VAL,
        repeat($.NL),
        $.variableDeclaration,
        repeat($.NL),
        $.ASSIGNMENT,
        repeat($.NL)
      )),
      $.expression,
      $.RPAREN
    ),

    whenExpression: $ => seq(
      $.WHEN,
      repeat($.NL),
      optional($.whenSubject),
      repeat($.NL),
      $.LCURL,
      repeat($.NL),
      repeat(seq(
        $.whenEntry,
        repeat($.NL)
      )),
      repeat($.NL),
      $.RCURL
    ),

    whenEntry: $ => choice(
      seq(
        $.whenCondition,
        repeat(seq(
          repeat($.NL),
          $.COMMA,
          repeat($.NL),
          $.whenCondition
        )),
        repeat($.NL),
        $.ARROW,
        repeat($.NL),
        $.controlStructureBody,
        optional($.semi)
      ),
      seq(
        $.ELSE,
        repeat($.NL),
        $.ARROW,
        repeat($.NL),
        $.controlStructureBody,
        optional($.semi)
      )
    ),

    whenCondition: $ => choice(
      $.expression,
      $.rangeTest,
      $.typeTest
    ),

    rangeTest: $ => seq(
      $.inOperator,
      repeat($.NL),
      $.expression
    ),

    typeTest: $ => seq(
      $.isOperator,
      repeat($.NL),
      $.type
    ),

    tryExpression: $ => seq(
      $.TRY,
      repeat($.NL),
      $.block,
      choice(
        seq(
          repeat1(seq(
            repeat($.NL),
            $.catchBlock
          )),
          optional(seq(
            repeat($.NL),
            $.finallyBlock
          ))
        ),
        seq(
          repeat($.NL),
          $.finallyBlock
        )
      )
    ),

    catchBlock: $ => seq(
      $.CATCH,
      repeat($.NL),
      $.LPAREN,
      repeat($.annotation),
      $.simpleIdentifier,
      $.COLON,
      $.type,
      $.RPAREN,
      repeat($.NL),
      $.block
    ),

    finallyBlock: $ => seq(
      $.FINALLY,
      repeat($.NL),
      $.block
    ),

    jumpExpression: $ => choice(
      seq(
        $.THROW,
        repeat($.NL),
        $.expression
      ),
      seq(
        choice(
          $.RETURN,
          $.RETURN_AT
        ),
        optional($.expression)
      ),
      $.CONTINUE,
      $.CONTINUE_AT,
      $.BREAK,
      $.BREAK_AT
    ),

    callableReference: $ => seq(
      optional($.receiverType),
      repeat($.NL),
      $.COLONCOLON,
      repeat($.NL),
      choice(
        $.simpleIdentifier,
        $.CLASS
      )
    ),

    assignmentAndOperator: $ => choice(
      $.ADD_ASSIGNMENT,
      $.SUB_ASSIGNMENT,
      $.MULT_ASSIGNMENT,
      $.DIV_ASSIGNMENT,
      $.MOD_ASSIGNMENT
    ),

    equalityOperator: $ => choice(
      $.EXCL_EQ,
      $.EXCL_EQEQ,
      $.EQEQ,
      $.EQEQEQ
    ),

    comparisonOperator: $ => choice(
      $.LANGLE,
      $.RANGLE,
      $.LE,
      $.GE
    ),

    inOperator: $ => choice(
      $.IN,
      $.NOT_IN
    ),

    isOperator: $ => choice(
      $.IS,
      $.NOT_IS
    ),

    additiveOperator: $ => choice(
      $.ADD,
      $.SUB
    ),

    multiplicativeOperator: $ => choice(
      $.MULT,
      $.DIV,
      $.MOD
    ),

    asOperator: $ => choice(
      $.AS,
      $.AS_SAFE
    ),

    prefixUnaryOperator: $ => choice(
      $.INCR,
      $.DECR,
      $.SUB,
      $.ADD,
      $.excl
    ),

    postfixUnaryOperator: $ => choice(
      $.INCR,
      $.DECR,
      seq(
        $.EXCL_NO_WS,
        $.excl
      )
    ),

    excl: $ => choice(
      $.EXCL_NO_WS,
      $.EXCL_WS
    ),

    memberAccessOperator: $ => choice(
      $.DOT,
      $.safeNav,
      $.COLONCOLON
    ),

    safeNav: $ => seq(
      $.QUEST_NO_WS,
      $.DOT
    ),

    modifiers: $ => repeat1(choice(
      $.annotation,
      $.modifier
    )),

    parameterModifiers: $ => repeat1(choice(
      $.annotation,
      $.parameterModifier
    )),

    modifier: $ => seq(
      choice(
        $.classModifier,
        $.memberModifier,
        $.visibilityModifier,
        $.functionModifier,
        $.propertyModifier,
        $.inheritanceModifier,
        $.parameterModifier,
        $.platformModifier
      ),
      repeat($.NL)
    ),

    typeModifiers: $ => repeat1($.typeModifier),

    typeModifier: $ => choice(
      $.annotation,
      seq(
        $.SUSPEND,
        repeat($.NL)
      )
    ),

    classModifier: $ => choice(
      $.ENUM,
      $.SEALED,
      $.ANNOTATION,
      $.DATA,
      $.INNER
    ),

    memberModifier: $ => choice(
      $.OVERRIDE,
      $.LATEINIT
    ),

    visibilityModifier: $ => choice(
      $.PUBLIC,
      $.PRIVATE,
      $.INTERNAL,
      $.PROTECTED
    ),

    varianceModifier: $ => choice(
      $.IN,
      $.OUT
    ),

    typeParameterModifiers: $ => repeat1($.typeParameterModifier),

    typeParameterModifier: $ => choice(
      seq(
        $.reificationModifier,
        repeat($.NL)
      ),
      seq(
        $.varianceModifier,
        repeat($.NL)
      ),
      $.annotation
    ),

    functionModifier: $ => choice(
      $.TAILREC,
      $.OPERATOR,
      $.INFIX,
      $.INLINE,
      $.EXTERNAL,
      $.SUSPEND
    ),

    propertyModifier: $ => $.CONST,

    inheritanceModifier: $ => choice(
      $.ABSTRACT,
      $.FINAL,
      $.OPEN
    ),

    parameterModifier: $ => choice(
      $.VARARG,
      $.NOINLINE,
      $.CROSSINLINE
    ),

    reificationModifier: $ => $.REIFIED,

    platformModifier: $ => choice(
      $.EXPECT,
      $.ACTUAL
    ),

    annotation: $ => seq(
      choice(
        $.singleAnnotation,
        $.multiAnnotation
      ),
      repeat($.NL)
    ),

    singleAnnotation: $ => choice(
      seq(
        $.annotationUseSiteTarget,
        repeat($.NL),
        $.unescapedAnnotation
      ),
      seq(
        choice(
          $.AT_NO_WS,
          $.AT_PRE_WS
        ),
        $.unescapedAnnotation
      )
    ),

    multiAnnotation: $ => choice(
      seq(
        $.annotationUseSiteTarget,
        repeat($.NL),
        $.LSQUARE,
        repeat1($.unescapedAnnotation),
        $.RSQUARE
      ),
      seq(
        choice(
          $.AT_NO_WS,
          $.AT_PRE_WS
        ),
        $.LSQUARE,
        repeat1($.unescapedAnnotation),
        $.RSQUARE
      )
    ),

    annotationUseSiteTarget: $ => seq(
      choice(
        $.AT_NO_WS,
        $.AT_PRE_WS
      ),
      choice(
        $.FIELD,
        $.PROPERTY,
        $.GET,
        $.SET,
        $.RECEIVER,
        $.PARAM,
        $.SETPARAM,
        $.DELEGATE
      ),
      repeat($.NL),
      $.COLON
    ),

    unescapedAnnotation: $ => choice(
      $.constructorInvocation,
      $.userType
    ),

    simpleIdentifier: $ => choice(
      $.Identifier,
      $.ABSTRACT,
      $.ANNOTATION,
      $.BY,
      $.CATCH,
      $.COMPANION,
      $.CONSTRUCTOR,
      $.CROSSINLINE,
      $.DATA,
      $.DYNAMIC,
      $.ENUM,
      $.EXTERNAL,
      $.FINAL,
      $.FINALLY,
      $.GET,
      $.IMPORT,
      $.INFIX,
      $.INIT,
      $.INLINE,
      $.INNER,
      $.INTERNAL,
      $.LATEINIT,
      $.NOINLINE,
      $.OPEN,
      $.OPERATOR,
      $.OUT,
      $.OVERRIDE,
      $.PRIVATE,
      $.PROTECTED,
      $.PUBLIC,
      $.REIFIED,
      $.SEALED,
      $.TAILREC,
      $.SET,
      $.VARARG,
      $.WHERE,
      $.FIELD,
      $.PROPERTY,
      $.RECEIVER,
      $.PARAM,
      $.SETPARAM,
      $.DELEGATE,
      $.FILE,
      $.EXPECT,
      $.ACTUAL,
      $.CONST,
      $.SUSPEND
    ),

    identifier: $ => seq(
      $.simpleIdentifier,
      repeat(seq(
        repeat($.NL),
        $.DOT,
        $.simpleIdentifier
      ))
    ),

    ShebangLine: $ => token(seq(
      "#!",
      repeat(/[^\r\n]/)
    )),

    DelimitedComment: $ => seq(
      "/*",
      repeat(choice(
        $.DelimitedComment,
        /.|\n/
      )),
      "*/"
    ),

    LineComment: $ => token(seq(
      "//",
      repeat(/[^\r\n]/)
    )),

    WS: $ => token(/[\u0020\u0009\u000C]/),

    NL: $ => token(choice(
      "\n",
      seq(
        "\r",
        optional("\n")
      )
    )),

    Hidden: $ => choice(
      $.DelimitedComment,
      $.LineComment,
      $.WS
    ),

    RESERVED: $ => token("..."),

    DOT: $ => token("."),

    COMMA: $ => token(","),

    LPAREN: $ => token("("),

    RPAREN: $ => token(")"),

    LSQUARE: $ => token("["),

    RSQUARE: $ => token("]"),

    LCURL: $ => token("{"),

    RCURL: $ => token("}"),

    MULT: $ => token("*"),

    MOD: $ => token("%"),

    DIV: $ => token("/"),

    ADD: $ => token("+"),

    SUB: $ => token("-"),

    INCR: $ => token("++"),

    DECR: $ => token("--"),

    CONJ: $ => token("&&"),

    DISJ: $ => token("||"),

    EXCL_WS: $ => seq(
      "!",
      $.Hidden
    ),

    EXCL_NO_WS: $ => token("!"),

    COLON: $ => token(":"),

    SEMICOLON: $ => token(";"),

    ASSIGNMENT: $ => token("="),

    ADD_ASSIGNMENT: $ => token("+="),

    SUB_ASSIGNMENT: $ => token("-="),

    MULT_ASSIGNMENT: $ => token("*="),

    DIV_ASSIGNMENT: $ => token("/="),

    MOD_ASSIGNMENT: $ => token("%="),

    ARROW: $ => token("->"),

    DOUBLE_ARROW: $ => token("=>"),

    RANGE: $ => token(".."),

    COLONCOLON: $ => token("::"),

    DOUBLE_SEMICOLON: $ => token(";;"),

    HASH: $ => token("#"),

    AT_NO_WS: $ => token("@"),

    AT_POST_WS: $ => seq(
      "@",
      choice(
        $.Hidden,
        $.NL
      )
    ),

    AT_PRE_WS: $ => seq(
      choice(
        $.Hidden,
        $.NL
      ),
      "@"
    ),

    AT_BOTH_WS: $ => seq(
      choice(
        $.Hidden,
        $.NL
      ),
      "@",
      choice(
        $.Hidden,
        $.NL
      )
    ),

    QUEST_WS: $ => seq(
      "?",
      $.Hidden
    ),

    QUEST_NO_WS: $ => token("?"),

    LANGLE: $ => token("<"),

    RANGLE: $ => token(">"),

    LE: $ => token("<="),

    GE: $ => token(">="),

    EXCL_EQ: $ => token("!="),

    EXCL_EQEQ: $ => token("!=="),

    AS_SAFE: $ => token("as?"),

    EQEQ: $ => token("=="),

    EQEQEQ: $ => token("==="),

    SINGLE_QUOTE: $ => token("\'"),

    RETURN_AT: $ => seq(
      "return@",
      $.Identifier
    ),

    CONTINUE_AT: $ => seq(
      "continue@",
      $.Identifier
    ),

    BREAK_AT: $ => seq(
      "break@",
      $.Identifier
    ),

    THIS_AT: $ => seq(
      "this@",
      $.Identifier
    ),

    SUPER_AT: $ => seq(
      "super@",
      $.Identifier
    ),

    FILE: $ => token("file"),

    FIELD: $ => token("field"),

    PROPERTY: $ => token("property"),

    GET: $ => token("get"),

    SET: $ => token("set"),

    RECEIVER: $ => token("receiver"),

    PARAM: $ => token("param"),

    SETPARAM: $ => token("setparam"),

    DELEGATE: $ => token("delegate"),

    PACKAGE: $ => token("package"),

    IMPORT: $ => token("import"),

    CLASS: $ => token("class"),

    INTERFACE: $ => token("interface"),

    FUN: $ => token("fun"),

    OBJECT: $ => token("object"),

    VAL: $ => token("val"),

    VAR: $ => token("var"),

    TYPE_ALIAS: $ => token("typealias"),

    CONSTRUCTOR: $ => token("constructor"),

    BY: $ => token("by"),

    COMPANION: $ => token("companion"),

    INIT: $ => token("init"),

    THIS: $ => token("this"),

    SUPER: $ => token("super"),

    TYPEOF: $ => token("typeof"),

    WHERE: $ => token("where"),

    IF: $ => token("if"),

    ELSE: $ => token("else"),

    WHEN: $ => token("when"),

    TRY: $ => token("try"),

    CATCH: $ => token("catch"),

    FINALLY: $ => token("finally"),

    FOR: $ => token("for"),

    DO: $ => token("do"),

    WHILE: $ => token("while"),

    THROW: $ => token("throw"),

    RETURN: $ => token("return"),

    CONTINUE: $ => token("continue"),

    BREAK: $ => token("break"),

    AS: $ => token("as"),

    IS: $ => token("is"),

    IN: $ => token("in"),

    NOT_IS: $ => seq(
      "!is",
      choice(
        $.Hidden,
        $.NL
      )
    ),

    NOT_IN: $ => seq(
      "!in",
      choice(
        $.Hidden,
        $.NL
      )
    ),

    OUT: $ => token("out"),

    DYNAMIC: $ => token("dynamic"),

    PUBLIC: $ => token("public"),

    PRIVATE: $ => token("private"),

    PROTECTED: $ => token("protected"),

    INTERNAL: $ => token("internal"),

    ENUM: $ => token("enum"),

    SEALED: $ => token("sealed"),

    ANNOTATION: $ => token("annotation"),

    DATA: $ => token("data"),

    INNER: $ => token("inner"),

    TAILREC: $ => token("tailrec"),

    OPERATOR: $ => token("operator"),

    INLINE: $ => token("inline"),

    INFIX: $ => token("infix"),

    EXTERNAL: $ => token("external"),

    SUSPEND: $ => token("suspend"),

    OVERRIDE: $ => token("override"),

    ABSTRACT: $ => token("abstract"),

    FINAL: $ => token("final"),

    OPEN: $ => token("open"),

    CONST: $ => token("const"),

    LATEINIT: $ => token("lateinit"),

    VARARG: $ => token("vararg"),

    NOINLINE: $ => token("noinline"),

    CROSSINLINE: $ => token("crossinline"),

    REIFIED: $ => token("reified"),

    EXPECT: $ => token("expect"),

    ACTUAL: $ => token("actual"),

    DecDigit: $ => token(/[0123456789]/),

    DecDigitNoZero: $ => token(/[123456789]/),

    DecDigitOrSeparator: $ => choice(
      $.DecDigit,
      "_"
    ),

    DecDigits: $ => choice(
      seq(
        $.DecDigit,
        repeat($.DecDigitOrSeparator),
        $.DecDigit
      ),
      $.DecDigit
    ),

    DoubleExponent: $ => seq(
      /[eE]/,
      optional(/[+-]/),
      $.DecDigits
    ),

    RealLiteral: $ => choice(
      $.FloatLiteral,
      $.DoubleLiteral
    ),

    FloatLiteral: $ => choice(
      seq(
        $.DoubleLiteral,
        /[fF]/
      ),
      seq(
        $.DecDigits,
        /[fF]/
      )
    ),

    DoubleLiteral: $ => choice(
      seq(
        optional($.DecDigits),
        ".",
        $.DecDigits,
        optional($.DoubleExponent)
      ),
      seq(
        $.DecDigits,
        $.DoubleExponent
      )
    ),

    IntegerLiteral: $ => choice(
      seq(
        $.DecDigitNoZero,
        repeat($.DecDigitOrSeparator),
        $.DecDigit
      ),
      $.DecDigit
    ),

    HexDigit: $ => token(/[0-9a-fA-F]/),

    HexDigitOrSeparator: $ => choice(
      $.HexDigit,
      "_"
    ),

    HexLiteral: $ => choice(
      seq(
        "0",
        /[xX]/,
        $.HexDigit,
        repeat($.HexDigitOrSeparator),
        $.HexDigit
      ),
      seq(
        "0",
        /[xX]/,
        $.HexDigit
      )
    ),

    BinDigit: $ => token(/[01]/),

    BinDigitOrSeparator: $ => choice(
      $.BinDigit,
      "_"
    ),

    BinLiteral: $ => choice(
      seq(
        "0",
        /[bB]/,
        $.BinDigit,
        repeat($.BinDigitOrSeparator),
        $.BinDigit
      ),
      seq(
        "0",
        /[bB]/,
        $.BinDigit
      )
    ),

    UnsignedLiteral: $ => seq(
      choice(
        $.IntegerLiteral,
        $.HexLiteral,
        $.BinLiteral
      ),
      /[uU]/,
      optional("L")
    ),

    LongLiteral: $ => seq(
      choice(
        $.IntegerLiteral,
        $.HexLiteral,
        $.BinLiteral
      ),
      "L"
    ),

    BooleanLiteral: $ => token(choice(
      "true",
      "false"
    )),

    NullLiteral: $ => token("null"),

    CharacterLiteral: $ => seq(
      "\'",
      choice(
        $.EscapeSeq,
        /[^\n\r'\\]/
      ),
      "\'"
    ),

    UnicodeDigit: $ => $.UNICODE_CLASS_ND,

    Identifier: $ => choice(
      seq(
        choice(
          $.Letter,
          "_"
        ),
        repeat(choice(
          $.Letter,
          "_",
          $.UnicodeDigit
        ))
      ),
      seq(
        "`",
        repeat1(/[^\r\n`]/),
        "`"
      )
    ),

    IdentifierOrSoftKey: $ => choice(
      $.Identifier,
      $.ABSTRACT,
      $.ANNOTATION,
      $.BY,
      $.CATCH,
      $.COMPANION,
      $.CONSTRUCTOR,
      $.CROSSINLINE,
      $.DATA,
      $.DYNAMIC,
      $.ENUM,
      $.EXTERNAL,
      $.FINAL,
      $.FINALLY,
      $.IMPORT,
      $.INFIX,
      $.INIT,
      $.INLINE,
      $.INNER,
      $.INTERNAL,
      $.LATEINIT,
      $.NOINLINE,
      $.OPEN,
      $.OPERATOR,
      $.OUT,
      $.OVERRIDE,
      $.PRIVATE,
      $.PROTECTED,
      $.PUBLIC,
      $.REIFIED,
      $.SEALED,
      $.TAILREC,
      $.VARARG,
      $.WHERE,
      $.GET,
      $.SET,
      $.FIELD,
      $.PROPERTY,
      $.RECEIVER,
      $.PARAM,
      $.SETPARAM,
      $.DELEGATE,
      $.FILE,
      $.EXPECT,
      $.ACTUAL,
      $.CONST,
      $.SUSPEND
    ),

    FieldIdentifier: $ => seq(
      "$",
      $.IdentifierOrSoftKey
    ),

    UniCharacterLiteral: $ => seq(
      "\\",
      "u",
      $.HexDigit,
      $.HexDigit,
      $.HexDigit,
      $.HexDigit
    ),

    EscapedIdentifier: $ => token(seq(
      "\\",
      choice(
        "t",
        "b",
        "r",
        "n",
        "\'",
        "\"",
        "\\",
        "$"
      )
    )),

    EscapeSeq: $ => choice(
      $.UniCharacterLiteral,
      $.EscapedIdentifier
    ),

    Letter: $ => choice(
      $.UNICODE_CLASS_LL,
      $.UNICODE_CLASS_LM,
      $.UNICODE_CLASS_LO,
      $.UNICODE_CLASS_LT,
      $.UNICODE_CLASS_LU,
      $.UNICODE_CLASS_NL
    ),

    QUOTE_OPEN: $ => token("\""),

    TRIPLE_QUOTE_OPEN: $ => token("\"\"\""),

    EOF: $ => token(/[\r\n]/),

    QUOTE_CLOSE: $ => token("\""),

    TRIPLE_QUOTE_CLOSE: $ => token("\"\"\""),

    UNICODE_CLASS_ND: $ => token(/[0-9]/),

    UNICODE_CLASS_LL: $ => token(/[A-Za-z]/),

    UNICODE_CLASS_LM: $ => token("#####################LM"),

    UNICODE_CLASS_LO: $ => token("#####################LO"),

    UNICODE_CLASS_LT: $ => token("#####################LT"),

    UNICODE_CLASS_LU: $ => token("#####################LU"),

    UNICODE_CLASS_NL: $ => token("#####################NL"),

    MultiLineStringQuote: $ => token("#####################1"),

    LineStrText: $ => token("#####################2"),

    LineStrEscapedChar: $ => token("#####################3"),

    LineStrRef: $ => token("#####################4"),

    LineStrExprStart: $ => token("#####################5"),

    MultiLineStrText: $ => token("#####################6"),

    MultiLineStrRef: $ => token("#####################7"),

    MultiLineStrExprStart: $ => token("#####################8"),

    }
});